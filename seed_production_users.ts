import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("Seeding Enhanced Institutional User Architecture...");
    
    // 1. Facilities
    await pool.query(`
      INSERT IGNORE INTO org_facilities (facility_name, facility_code, facility_category, is_corporate_managed) 
      VALUES (?, ?, ?, ?)
    `, ['Nelson Corporate Head Office', 'CORP01', 'CORPORATE', true]);
    
    const [corpRow]: any = await pool.query('SELECT facility_id FROM org_facilities WHERE facility_code = ?', ['CORP01']);
    const corpId = corpRow[0].facility_id;

    await pool.query(`
      INSERT IGNORE INTO org_facilities (facility_name, facility_code, parent_facility_id, location) 
      VALUES (?, ?, ?, ?)
    `, ['Main Medical Center', 'FAC01', corpId, 'Sector 12, Hospital Road']);
    
    await pool.query(`
      INSERT IGNORE INTO org_facilities (facility_name, facility_code, parent_facility_id, location) 
      VALUES (?, ?, ?, ?)
    `, ['North Diagnostic Wing', 'FAC02', corpId, 'North Block, Level 2']);
    
    const [facRow]: any = await pool.query('SELECT facility_id FROM org_facilities WHERE facility_code = ?', ['FAC01']);
    const fac01Id = facRow[0].facility_id;

    const [fac02Row]: any = await pool.query('SELECT facility_id FROM org_facilities WHERE facility_code = ?', ['FAC02']);
    const fac02Id = fac02Row[0].facility_id;

    // 2. Departments (Scoped to Facility)
    await pool.query('INSERT IGNORE INTO hr_departments (department_name, department_code, facility_id) VALUES (?, ?, ?)', ['Clinical Services', 'CLIN01', fac01Id]);
    await pool.query('INSERT IGNORE INTO hr_departments (department_name, department_code, facility_id) VALUES (?, ?, ?)', ['Administration', 'ADM01', fac01Id]);
    await pool.query('INSERT IGNORE INTO hr_departments (department_name, department_code, facility_id) VALUES (?, ?, ?)', ['Security', 'SEC01_DEP', fac01Id]);
    await pool.query('INSERT IGNORE INTO hr_departments (department_name, department_code, facility_id) VALUES (?, ?, ?)', ['Corporate HQ', 'CHQ01', corpId]);
    
    const [depRow]: any = await pool.query('SELECT department_id FROM hr_departments WHERE department_code = ?', ['CLIN01']);
    const clinicalId = depRow[0].department_id;

    const [secDepRow]: any = await pool.query('SELECT department_id FROM hr_departments WHERE department_code = ?', ['SEC01_DEP']);
    const secId = secDepRow[0].department_id;

    const [corpHqRow]: any = await pool.query('SELECT department_id FROM hr_departments WHERE department_code = ?', ['CHQ01']);
    const corpDepId = corpHqRow[0].department_id;

    // 3. Shifts
    await pool.query('INSERT IGNORE INTO shift_master (shift_name, start_time, end_time, is_night_shift) VALUES (?, ?, ?, ?)', ['Morning Duty', '08:00:00', '20:00:00', false]);
    await pool.query('INSERT IGNORE INTO shift_master (shift_name, start_time, end_time, is_night_shift) VALUES (?, ?, ?, ?)', ['Night Duty', '20:00:00', '08:00:00', true]);
    
    const [shiftRow]: any = await pool.query('SELECT shift_id FROM shift_master WHERE shift_name = ?', ['Morning Duty']);
    const morningShiftId = shiftRow[0].shift_id;

    // 4. Roles & Permissions Matrix
    const roles = [
      { code: 'SUPER_ADMIN', name: 'Super Admin' },
      { code: 'CORPORATE_ADMIN', name: 'Corporate Admin' },
      { code: 'SECURITY_GUARD', name: 'Security Guard' },
      { code: 'HOD', name: 'Head of Department' },
      { code: 'SECHOD', name: 'Security HOD' },
      { code: 'FACILITY_ADMIN', name: 'Facility Admin' },
      { code: 'HR_MANAGER', name: 'HR Manager' },
      { code: 'STAFF', name: 'Staff' }
    ];
    for (const r of roles) {
      await pool.query('INSERT IGNORE INTO auth_roles (role_code, role_name) VALUES (?, ?)', [r.code, r.name]);
    }

    // Restricted Zones
    await pool.query('INSERT IGNORE INTO restricted_zones (zone_name, risk_level, facility_id) VALUES (?, ?, ?)', ['Pharmacy Store', 'HIGH', fac01Id]);
    await pool.query('INSERT IGNORE INTO restricted_zones (zone_name, risk_level, facility_id) VALUES (?, ?, ?)', ['Server Room', 'CRITICAL', fac01Id]);

    // Workflow Matrix
    await pool.query('INSERT IGNORE INTO workflow_approval_matrix (workflow_type, required_role_code, approval_order) VALUES (?, ?, ?)', ['RESTRICTED_ZONE', 'HOD', 1]);
    await pool.query('INSERT IGNORE INTO workflow_approval_matrix (workflow_type, required_role_code, approval_order) VALUES (?, ?, ?)', ['RESTRICTED_ZONE', 'SECHOD', 2]);

    const perms = [
      { key: 'gatepass.create', module: 'Gatepass', desc: 'Can request gatepasses' },
      { key: 'gatepass.approve', module: 'Gatepass', desc: 'Can approve department requests' },
      { key: 'gatepass.scan', module: 'Gatepass', desc: 'Can scan and verify passes at gates' },
      { key: 'hr.audit', module: 'HR', desc: 'Can view escalation and compliance data' },
      { key: 'system.manage', module: 'Admin', desc: 'Total system control' },
      { key: 'incident.manage', module: 'Security', desc: 'Can manage security incidents' },
      { key: 'security.override', module: 'Security', desc: 'Manual override permissions' },
      { key: 'VIEW_ALL_GATEPASSES', module: 'Security', desc: 'Can view all gatepasses across facility' },
      { key: 'PROCESS_GATEPASS_MOVEMENT', module: 'Security', desc: 'Can process gate movement' },
      { key: 'VIEW_RESTRICTED_ZONES', module: 'Security', desc: 'Can view restricted zones' },
      { key: 'GRANT_ZONE_ACCESS', module: 'Security', desc: 'Can grant access to zones' },
      { key: 'MANAGE_SECURITY_INCIDENTS', module: 'Security', desc: 'Full incident management' },
      { key: 'OVERRIDE_GATEPASS_AUTHORIZATION', module: 'Security', desc: 'SOP override' }
    ];
    for (const p of perms) {
       await pool.query('INSERT IGNORE INTO auth_permissions (permission_key, module_name, description) VALUES (?, ?, ?)', [p.key, p.module, p.desc]);
    }

    // Assign perms (Simple mapping for seed)
    const [adminRole]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = "SUPER_ADMIN"');
    const [sechodRole]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = "SECHOD"');
    const [sysManage]: any = await pool.query('SELECT id FROM auth_permissions WHERE permission_key = "system.manage"');
    
    await pool.query('INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRole[0].id, sysManage[0].id]);
    
    const sechodPermKeys = [
      'VIEW_ALL_GATEPASSES', 
      'PROCESS_GATEPASS_MOVEMENT', 
      'VIEW_RESTRICTED_ZONES', 
      'GRANT_ZONE_ACCESS', 
      'MANAGE_SECURITY_INCIDENTS', 
      'OVERRIDE_GATEPASS_AUTHORIZATION'
    ];
    
    for (const key of sechodPermKeys) {
      const [p]: any = await pool.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [key]);
      if (p.length > 0) {
        await pool.query('INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [sechodRole[0].id, p[0].id]);
      }
    }

    // 5. User & Employee Data
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = [
      { username: 'super_admin', email: 'admin@hospital.com', role: 'SUPER_ADMIN', emp: { code: 'EMP_ADM', first: 'Super', last: 'Admin' } },
      { username: 'CORP_ADMIN01', email: 'corp@nelson.com', role: 'CORPORATE_ADMIN', emp: { code: 'EMP_CORP01', first: 'Corporate', last: 'Executive' }, dep: corpDepId, fac: corpId },
      { username: 'SEC01', email: 'sec01@hospital.com', role: 'SECURITY_GUARD', emp: { code: 'EMP_SEC01', first: 'Security', last: 'Officer' }, shiftId: morningShiftId, fac: fac01Id },
      { username: 'HOD01', email: 'hod01@hospital.com', role: 'HOD', emp: { code: 'EMP_HOD01', first: 'Clinical', last: 'HOD' }, dep: clinicalId, fac: fac01Id },
      { username: 'SECHOD01', email: 'sechod01@nelsonhospital.com', role: 'SECHOD', emp: { code: 'EMP_SECHOD01', first: 'Security', last: 'HOD' }, dep: secId, fac: fac01Id },
      { username: 'ADMIN01', email: 'admin01@hospital.com', role: 'FACILITY_ADMIN', emp: { code: 'EMP_ADMIN01', first: 'Facility', last: 'Administrator' }, fac: fac01Id },
      { username: 'HR01', email: 'hr01@hospital.com', role: 'HR_MANAGER', emp: { code: 'EMP_HR01', first: 'HR', last: 'Manager' }, fac: fac01Id },
      { username: 'EMP01', email: 'emp01@hospital.com', role: 'STAFF', emp: { code: 'EMP_01', first: 'John', last: 'Doe', quota: 3 }, fac: fac01Id },
      { username: 'DIAG_EMP01', email: 'diag@hospital.com', role: 'STAFF', emp: { code: 'EMP_DIAG01', first: 'Diag', last: 'Tech', quota: 5 }, fac: fac02Id },
    ];

    for (const u of users) {
      // Create User
      const userScope = u.role === 'CORPORATE_ADMIN' || u.role === 'SUPER_ADMIN' ? 'CORPORATE' : 'FACILITY';
      await pool.query(
        'INSERT IGNORE INTO auth_users (username, email, password, role, user_scope, status, first_login_completed) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [u.username, u.email, hashedPassword, u.role, userScope, 'ACTIVE', true]
      );
      
      const [uRow]: any = await pool.query('SELECT id FROM auth_users WHERE username = ?', [u.username]);
      const userId = uRow[0].id;

      // Create Employee
      await pool.query(
        'INSERT IGNORE INTO hr_employees (employee_code, first_name, last_name, department_id, monthly_quota) VALUES (?, ?, ?, ?, ?)',
        [u.emp.code, u.emp.first, u.emp.last, (u as any).dep || null, u.emp.quota || 0]
      );
      
      const [eRow]: any = await pool.query('SELECT employee_id FROM hr_employees WHERE employee_code = ?', [u.emp.code]);
      const employeeId = eRow[0].employee_id;

      // Map User to Employee
      await pool.query('INSERT IGNORE INTO hr_employee_user_mapping (employee_id, user_id) VALUES (?, ?)', [employeeId, userId]);

      // Facility Access
      const assignmentFacId = (u as any).fac || fac01Id;
      await pool.query('INSERT IGNORE INTO employee_facility_access (user_id, facility_id) VALUES (?, ?)', [userId, assignmentFacId]);

      // Shift Assignment
      if (u.shiftId) {
        await pool.query('INSERT IGNORE INTO employee_shift_assignments (user_id, shift_id, effective_from) VALUES (?, ?, ?)', [userId, u.shiftId, '2024-01-01']);
      }

      // If HOD, assign in dynamic roles
      if (u.role === 'HOD' || u.role === 'SECHOD') {
         await pool.query(
           'INSERT IGNORE INTO department_role_assignments (department_id, user_id, assigned_role) VALUES (?, ?, ?)',
           [(u as any).dep || clinicalId, userId, 'HOD']
         );
      }
    }

    // 6. Security Gates
    await pool.query('INSERT IGNORE INTO gate_master (gate_name, gate_type, facility_id) VALUES (?, ?, ?)', ['Main Entry Gate', 'STAFF', fac01Id]);
    await pool.query('INSERT IGNORE INTO gate_master (gate_name, gate_type, facility_id) VALUES (?, ?, ?)', ['Service Gate West', 'SERVICE', fac01Id]);
    await pool.query('INSERT IGNORE INTO gate_master (gate_name, gate_type, facility_id) VALUES (?, ?, ?)', ['Emergency Entry', 'AMBULANCE', fac01Id]);

    const [gateRow]: any = await pool.query('SELECT gate_id FROM gate_master LIMIT 1');
    if (gateRow.length > 0) {
      await pool.query('INSERT INTO gate_traffic (gate_id, movement_type) VALUES (?, ?)', [gateRow[0].gate_id, 'IN']);
      await pool.query('INSERT INTO gate_traffic (gate_id, movement_type) VALUES (?, ?)', [gateRow[0].gate_id, 'OUT']);
    }

    console.log("Seeding complete.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
