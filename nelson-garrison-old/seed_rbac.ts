import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("Applying table alterations...");
    
    // Add columns dynamically safely 
    const tablesWithSoftDelete = [
      'auth_roles', 'auth_permissions', 'hr_departments', 'visitor_master',
      'visitor_visits', 'gatepass_approvals', 'gatepass_movements',
      'gatepass_violations', 'restricted_zones', 'system_notifications',
      'active_sessions'
    ];

    for (const tableName of tablesWithSoftDelete) {
      try {
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN deleted_at DATETIME NULL`);
      } catch (e: any) {
         if (!e.message.includes('Duplicate column')) console.log(e.message);
      }
    }

    const tablesWithTimestamps = [
      'visitor_visits', 'gatepass_approvals', 'gatepass_movements',
      'gatepass_violations', 'restricted_zones', 'system_notifications',
      'active_sessions', 'auth_roles', 'auth_permissions'
    ];

    for (const tableName of tablesWithTimestamps) {
      try {
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      } catch (e: any) {
        if (!e.message.includes('Duplicate column')) console.log(e.message);
      }
      try {
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      } catch (e: any) {
        if (!e.message.includes('Duplicate column')) console.log(e.message);
      }
    }

    console.log("Seeding RBAC Roles and Permissions...");
    
    // Roles requested: Super Admin, Admin, HR, HOD, Security Supervisor, Security Guard, Reception, IT Admin, Audit Viewer.
    const roles = [
      { name: 'Super Admin', code: 'SUPER_ADMIN' },
      { name: 'Admin', code: 'ADMIN' },
      { name: 'HR', code: 'HR' },
      { name: 'HOD', code: 'HOD' },
      { name: 'Security Supervisor', code: 'SECURITY_SUPERVISOR' },
      { name: 'Security Guard', code: 'SECURITY_GUARD' },
      { name: 'Reception', code: 'RECEPTION' },
      { name: 'IT Admin', code: 'IT_ADMIN' },
      { name: 'Audit Viewer', code: 'AUDIT_VIEWER' }
    ];

    const roleMap: Record<string, number> = {};
    for (const role of roles) {
      const [res]: any = await pool.query('INSERT IGNORE INTO auth_roles (role_name, role_code) VALUES (?, ?)', [role.name, role.code]);
      const [row]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = ?', [role.code]);
      roleMap[role.code] = row[0].id;
    }

    const permissions = [
      // Staff Gatepass
      { key: 'MANAGE_OWN_GATEPASS', module: 'GATEPASS', desc: 'Create and view own gatepasses' },
      { key: 'APPROVE_GATEPASS', module: 'GATEPASS', desc: 'Approve or reject gatepasses' },
      { key: 'VIEW_ALL_GATEPASSES', module: 'GATEPASS', desc: 'View all gatepass records' },
      { key: 'PROCESS_GATEPASS_MOVEMENT', module: 'GATEPASS', desc: 'Scan and process entries/exits' },
      
      // Visitor Management
      { key: 'CREATE_VISITOR', module: 'VISITOR', desc: 'Register new visitors' },
      { key: 'VIEW_VISITORS', module: 'VISITOR', desc: 'View visitor logs' },
      { key: 'MANAGE_BLACKLIST', module: 'VISITOR', desc: 'Add or remove visitors from blacklist' },
      
      // Restricted Zone
      { key: 'VIEW_RESTRICTED_ZONES', module: 'ZONE', desc: 'View zones and logs' },
      { key: 'MANAGE_RESTRICTED_ZONES', module: 'ZONE', desc: 'Create and edit restricted zones' },
      { key: 'GRANT_ZONE_ACCESS', module: 'ZONE', desc: 'Grant access to restricted zones' },
      
      // Admin Control Panel
      { key: 'VIEW_ADMIN_PANEL', module: 'ADMIN', desc: 'Access admin panel' },
      { key: 'MANAGE_USERS', module: 'ADMIN', desc: 'Manage users and roles' },
      { key: 'MANAGE_DEPARTMENTS', module: 'ADMIN', desc: 'Manage departments and designations' },
      { key: 'MANAGE_WORKFLOWS', module: 'ADMIN', desc: 'Edit approval workflow matrix' },
      { key: 'VIEW_AUDIT_LOGS', module: 'ADMIN', desc: 'View system audit logs' }
    ];

    const permMap: Record<string, number> = {};
    for (const perm of permissions) {
      // note: auth_permissions table has "permission_key" in db.ts, so we'll use permission_key
      const [res]: any = await pool.query('INSERT IGNORE INTO auth_permissions (permission_key, module_name, description) VALUES (?, ?, ?)', [perm.key, perm.module, perm.desc]);
      const [row]: any = await pool.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [perm.key]);
      permMap[perm.key] = row[0].id;
    }

    const rolePerms: Record<string, string[]> = {
      'SUPER_ADMIN': permissions.map(p => p.key),
      'ADMIN': ['MANAGE_OWN_GATEPASS', 'VIEW_ALL_GATEPASSES', 'VIEW_VISITORS', 'CREATE_VISITOR', 'VIEW_RESTRICTED_ZONES', 'MANAGE_RESTRICTED_ZONES', 'GRANT_ZONE_ACCESS', 'VIEW_ADMIN_PANEL', 'MANAGE_USERS', 'MANAGE_DEPARTMENTS', 'MANAGE_WORKFLOWS'],
      'HR': ['MANAGE_OWN_GATEPASS', 'APPROVE_GATEPASS', 'VIEW_ALL_GATEPASSES', 'VIEW_VISITORS', 'VIEW_ADMIN_PANEL', 'MANAGE_USERS', 'MANAGE_DEPARTMENTS'],
      'HOD': ['MANAGE_OWN_GATEPASS', 'APPROVE_GATEPASS', 'VIEW_ALL_GATEPASSES', 'VIEW_RESTRICTED_ZONES', 'GRANT_ZONE_ACCESS'],
      'SECURITY_SUPERVISOR': ['MANAGE_OWN_GATEPASS', 'VIEW_ALL_GATEPASSES', 'PROCESS_GATEPASS_MOVEMENT', 'VIEW_VISITORS', 'CREATE_VISITOR', 'MANAGE_BLACKLIST', 'VIEW_RESTRICTED_ZONES'],
      'SECURITY_GUARD': ['MANAGE_OWN_GATEPASS', 'PROCESS_GATEPASS_MOVEMENT', 'VIEW_VISITORS', 'VIEW_RESTRICTED_ZONES'],
      'RECEPTION': ['MANAGE_OWN_GATEPASS', 'CREATE_VISITOR', 'VIEW_VISITORS'],
      'IT_ADMIN': ['MANAGE_OWN_GATEPASS', 'VIEW_ADMIN_PANEL', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS'],
      'AUDIT_VIEWER': ['VIEW_ALL_GATEPASSES', 'VIEW_VISITORS', 'VIEW_RESTRICTED_ZONES', 'VIEW_ADMIN_PANEL', 'VIEW_AUDIT_LOGS']
    };

    for (const [roleCode, permKeys] of Object.entries(rolePerms)) {
      const roleId = roleMap[roleCode];
      for (const pk of permKeys) {
        const permId = permMap[pk];
        await pool.query('INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
      }
    }

    console.log("Seeding complete.");

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
