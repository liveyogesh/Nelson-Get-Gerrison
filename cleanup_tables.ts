import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("Cleaning and Re-initializing Core Tables...");
    const conn = await pool.getConnection();

    const tablesToDrop = [
        'hr_employee_user_mapping',
        'gatepass_approvals',
        'gatepass_requests',
        'department_role_assignments',
        'hr_employees',
        'hr_departments',
        'auth_role_permissions',
        'auth_user_roles',
        'auth_users',
        'auth_roles',
        'auth_permissions',
        'system_settings',
        'delegated_authority',
        'system_notifications',
        'audit_logs',
        'org_facilities',
        'employee_facility_access',
        'shift_master',
        'employee_shift_assignments',
        'active_sessions',
        'login_history',
        'restricted_zones',
        'restricted_zone_access_requests',
        'security_incidents',
        'workflow_approval_matrix',
        'facility_security_policies',
        'security_devices',
        'gate_master',
        'gate_traffic',
        'org_facilities'
    ];

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of tablesToDrop) {
        await conn.query(`DROP TABLE IF EXISTS ${t}`);
        console.log(`Dropped ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    conn.release();
    console.log("Cleanup complete. Now run initDB or Seed.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
