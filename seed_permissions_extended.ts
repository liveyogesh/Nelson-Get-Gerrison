import pool from './server/db.js';

const extendedPermissions = [
  // User Management
  { key: 'users.view', module: 'User Management', desc: 'View user details' },
  { key: 'users.create', module: 'User Management', desc: 'Create new users' },
  { key: 'users.edit', module: 'User Management', desc: 'Edit user details' },
  { key: 'users.delete', module: 'User Management', desc: 'Delete users' },
  { key: 'users.roles.assign', module: 'User Management', desc: 'Assign roles to users' },

  // Role Management
  { key: 'roles.view', module: 'Role Management', desc: 'View roles and permissions' },
  { key: 'roles.manage', module: 'Role Management', desc: 'Create, edit, delete roles' },
  { key: 'roles.permissions.assign', module: 'Role Management', desc: 'Assign permissions to roles' },

  // Gatepass Management
  { key: 'gatepass.view', module: 'Gatepass Management', desc: 'View gatepasses' },
  { key: 'gatepass.create', module: 'Gatepass Management', desc: 'Create gatepass requests' },
  { key: 'gatepass.approve', module: 'Gatepass Management', desc: 'Approve or reject gatepasses' },
  { key: 'gatepass.scan', module: 'Gatepass Management', desc: 'Scan and process gatepasses at gate' },
  { key: 'gatepass.override', module: 'Gatepass Management', desc: 'Override standard gatepass rules' },
  { key: 'gatepass.history.view', module: 'Gatepass Management', desc: 'View complete gatepass history' },
  { key: 'gatepass.settings', module: 'Gatepass Management', desc: 'Configure gatepass rules' },

  // Facility Settings
  { key: 'facility.view', module: 'Facility Management', desc: 'View facility structure' },
  { key: 'facility.manage', module: 'Facility Management', desc: 'Manage facilities and locations' },
  { key: 'facility.zones.view', module: 'Facility Management', desc: 'View restricted zones' },
  { key: 'facility.zones.manage', module: 'Facility Management', desc: 'Manage restricted zones' },
  { key: 'facility.departments.view', module: 'Facility Management', desc: 'View departments' },
  { key: 'facility.departments.manage', module: 'Facility Management', desc: 'Manage departments' },

  // HR & Employee
  { key: 'hr.employee.view', module: 'HR Management', desc: 'View employee records' },
  { key: 'hr.employee.manage', module: 'HR Management', desc: 'Manage employee records' },
  { key: 'hr.shift.manage', module: 'HR Management', desc: 'Manage shifts and assignments' },
  { key: 'hr.compliance.view', module: 'HR Management', desc: 'View compliance and escalation reports' },

  // Security Operations
  { key: 'security.dashboard.view', module: 'Security Operations', desc: 'View security dashboard' },
  { key: 'security.incidents.view', module: 'Security Operations', desc: 'View security incidents' },
  { key: 'security.incidents.manage', module: 'Security Operations', desc: 'Manage and resolve incidents' },
  { key: 'security.gates.manage', module: 'Security Operations', desc: 'Manage security gates' },

  // System Administration
  { key: 'system.settings.view', module: 'System Admin', desc: 'View system configuration' },
  { key: 'system.settings.manage', module: 'System Admin', desc: 'Manage system configuration' },
  { key: 'system.audit.view', module: 'System Admin', desc: 'View audit logs' },
  { key: 'system.integration.manage', module: 'System Admin', desc: 'Manage system integrations' },
  
  // Reports & Analytics
  { key: 'reports.operational.view', module: 'Reports', desc: 'View operational reports' },
  { key: 'reports.security.view', module: 'Reports', desc: 'View security audit reports' },
  { key: 'reports.corporate.view', module: 'Reports', desc: 'View high-level corporate data' },
  { key: 'reports.export', module: 'Reports', desc: 'Export reports and data' }
];

const extendedRoles = [
  { code: 'SUPER_ADMIN', name: 'Super Admin', perms: ['*'] },
  { code: 'CORPORATE_ADMIN', name: 'Corporate Admin', perms: [
    'users.view', 'users.create', 'users.edit', 'roles.view', 'facility.view', 'facility.manage', 
    'hr.employee.view', 'hr.compliance.view', 'security.dashboard.view', 'system.settings.view', 
    'reports.corporate.view', 'reports.export'
  ] },
  { code: 'FACILITY_ADMIN', name: 'Facility Admin', perms: [
    'users.view', 'facility.view', 'facility.zones.view', 'facility.departments.view',
    'hr.employee.view', 'security.dashboard.view', 'reports.operational.view'
  ] },
  { code: 'SECHOD', name: 'Security Head of Department', perms: [
    'gatepass.view', 'gatepass.approve', 'gatepass.history.view', 'gatepass.settings', 'gatepass.override',
    'facility.zones.view', 'security.dashboard.view', 'security.incidents.view', 'security.incidents.manage', 'security.gates.manage',
    'reports.security.view', 'reports.export'
  ] },
  { code: 'SECURITY_GUARD', name: 'Security Guard', perms: [
    'gatepass.scan', 'security.incidents.view'
  ] },
  { code: 'HOD', name: 'Head of Department', perms: [
    'gatepass.view', 'gatepass.create', 'gatepass.approve', 'hr.employee.view', 'reports.operational.view'
  ] },
  { code: 'HR_MANAGER', name: 'HR Manager', perms: [
    'users.view', 'hr.employee.view', 'hr.employee.manage', 'hr.shift.manage', 'hr.compliance.view', 'facility.departments.view'
  ] },
  { code: 'STAFF', name: 'General Staff', perms: [
    'gatepass.create', 'gatepass.view'
  ] },
  { code: 'AUDITOR', name: 'Auditor', perms: [
    'system.audit.view', 'reports.corporate.view', 'reports.security.view', 'reports.operational.view'
  ] }
];

async function seedExtended() {
  try {
    console.log("Seeding extended permissions and roles...");
    // 1. Insert any new permissions
    for (const p of extendedPermissions) {
       await pool.query('INSERT IGNORE INTO auth_permissions (permission_key, module_name, description) VALUES (?, ?, ?)', [p.key, p.module, p.desc]);
    }

    // 2. Insert any new roles
    for (const r of extendedRoles) {
       await pool.query('INSERT IGNORE INTO auth_roles (role_code, role_name) VALUES (?, ?)', [r.code, r.name]);
       
       const [roleRows]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = ?', [r.code]);
       if (!roleRows || roleRows.length === 0) continue;
       const roleId = roleRows[0].id;

       if (r.perms.includes('*')) {
         const [allPerms]: any = await pool.query('SELECT id FROM auth_permissions');
         for (const perm of allPerms) {
           await pool.query('INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, perm.id]);
         }
       } else {
         for (const permKey of r.perms) {
           const [pRow]: any = await pool.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [permKey]);
           if (pRow.length > 0) {
             await pool.query('INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pRow[0].id]);
           }
         }
       }
    }

    // 3. Optional: Give SUPER_ADMIN all permissions including the previously existing ones
    console.log("Ensuring SUPER_ADMIN has ALL permissions...");
    const [superAdminRow]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = "SUPER_ADMIN"');
    if (superAdminRow.length > 0) {
      const superAdminId = superAdminRow[0].id;
      const [allPerms]: any = await pool.query('SELECT id FROM auth_permissions');
      for (const perm of allPerms) {
        await pool.query('INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [superAdminId, perm.id]);
      }
    }

    console.log("Extended permissions seeded successfully.");
  } catch (err) {
    console.error("Error seeding extended permissions:", err);
  } finally {
    process.exit();
  }
}

seedExtended();
