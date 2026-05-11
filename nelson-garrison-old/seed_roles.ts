import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("Seeding Roles and Permissions...");

    // 1. Base Permissions
    const basePermissions = [
      { key: 'VIEW_ALL_GATEPASSES', module: 'GATEPASS', desc: 'Can view all gatepasses in the facility' },
      { key: 'PROCESS_GATEPASS_MOVEMENT', module: 'GATEPASS', desc: 'Can check-in and check-out gatepasses' },
      { key: 'VIEW_RESTRICTED_ZONES', module: 'ZONES', desc: 'Can view all restricted zones and access logs' },
      { key: 'APPROVE_GATEPASS', module: 'GATEPASS', desc: 'Can approve gatepass requests' },
      { key: 'SUPER_ADMIN', module: 'ADMIN', desc: 'Full system administration access' },
      { key: 'SYSTEM_CONFIG', module: 'ADMIN', desc: 'Can modify system settings' },
    ];

    for (const p of basePermissions) {
      await pool.query(
        'INSERT IGNORE INTO auth_permissions (permission_key, module_name, description) VALUES (?, ?, ?)',
        [p.key, p.module, p.desc]
      );
    }

    // 2. Roles
    const baseRoles = [
      { code: 'SECURITY_PERSONNEL', name: 'Security Personnel', desc: 'Guards handling gate and zone access' },
      { code: 'SUPER_ADMIN', name: 'Super Administrator', desc: 'Global admin access' }
    ];

    for (const r of baseRoles) {
      await pool.query(
        'INSERT IGNORE INTO auth_roles (role_code, role_name, description) VALUES (?, ?, ?)',
        [r.code, r.name, r.desc]
      );
    }

    // 3. Map permissions to Security Personnel
    const [secRole]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = "SECURITY_PERSONNEL"');
    if (secRole.length > 0) {
      const permsToMap = ['VIEW_ALL_GATEPASSES', 'PROCESS_GATEPASS_MOVEMENT', 'VIEW_RESTRICTED_ZONES'];
      for (const pKey of permsToMap) {
        const [perm]: any = await pool.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [pKey]);
        if (perm.length > 0) {
          await pool.query(
            'INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)',
            [secRole[0].id, perm[0].id]
          );
        }
      }
    }

    // 4. Map super admin perms
    const [saRole]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = "SUPER_ADMIN"');
    if (saRole.length > 0) {
       const [allPerms]: any = await pool.query('SELECT id FROM auth_permissions');
       for (const perm of allPerms) {
          await pool.query(
            'INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)',
            [saRole[0].id, perm.id]
          );
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
