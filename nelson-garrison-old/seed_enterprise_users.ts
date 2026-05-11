import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("== Starting Enterprise User Seed ==");

    // 1. Roles and Permissions
    const newRoles = [
      { name: 'Security HOD', code: 'SECURITY_HOD' },
      { name: 'HR Manager', code: 'HR_MANAGER' },
      { name: 'Employee', code: 'EMPLOYEE' }
    ];

    for (const role of newRoles) {
      await pool.query('INSERT IGNORE INTO auth_roles (role_name, role_code) VALUES (?, ?)', [role.name, role.code]);
    }

    const newPerms = [
      { key: 'VIEW_ALL_SECURITY_OPS', module: 'SECURITY', desc: 'View all security operations and guard status' },
      { key: 'APPROVE_EMERGENCY_MOVEMENT', module: 'SECURITY', desc: 'Approve emergency overrides' },
      { key: 'MANAGE_GUARDS', module: 'SECURITY', desc: 'Manage security staff and shifts' },
      { key: 'VIEW_SECURITY_ANALYTICS', module: 'SECURITY', desc: 'View analytics and incident trends' }
    ];

    for (const perm of newPerms) {
      await pool.query('INSERT IGNORE INTO auth_permissions (permission_key, module_name, description) VALUES (?, ?, ?)', [perm.key, perm.module, perm.desc]);
    }

    // Grant perms to SECURITY_HOD
    const [secHodRole]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = ?', ['SECURITY_HOD']);
    if (secHodRole.length > 0) {
      const roleId = secHodRole[0].id;
      const perms = ['VIEW_ALL_SECURITY_OPS', 'APPROVE_EMERGENCY_MOVEMENT', 'MANAGE_GUARDS', 'VIEW_SECURITY_ANALYTICS', 'VIEW_RESTRICTED_ZONES', 'VIEW_ALL_GATEPASSES', 'PROCESS_GATEPASS_MOVEMENT', 'CREATE_VISITOR', 'VIEW_VISITORS', 'MANAGE_BLACKLIST'];
      for (const pk of perms) {
        const [pRows]: any = await pool.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [pk]);
        if (pRows.length > 0) {
          await pool.query('INSERT IGNORE INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pRows[0].id]);
        }
      }
    }

    // 2. Base Institutional Setup
    // Ensure we have a default country, state, city to fulfill FKs
    let countryId, stateId, cityId;
    await pool.query("INSERT IGNORE INTO geo_countries (country_code, country_name) VALUES ('IN', 'India')");
    let [resCount]: any = await pool.query("SELECT country_id FROM geo_countries WHERE country_code = 'IN'");
    countryId = resCount[0].country_id;

    await pool.query("INSERT IGNORE INTO geo_states (country_id, state_code, state_name) VALUES (?, 'MH', 'Maharashtra')", [countryId]);
    let [resState]: any = await pool.query("SELECT state_id FROM geo_states WHERE state_code = 'MH'");
    stateId = resState[0].state_id;

    await pool.query("INSERT IGNORE INTO geo_cities (state_id, city_code, city_name) VALUES (?, 'MUM', 'Mumbai')", [stateId]);
    let [resCity]: any = await pool.query("SELECT city_id FROM geo_cities WHERE city_code = 'MUM'");
    cityId = resCity[0].city_id;

    // Default Facility
    let facilityId;
    await pool.query(`INSERT IGNORE INTO org_facilities (facility_code, facility_name, facility_type, country_id, state_id, city_id) VALUES ('HQ01', 'Nelson Hospital Main', 'HOSPITAL', ?, ?, ?)`, [countryId, stateId, cityId]);
    let [resFac]: any = await pool.query("SELECT facility_id FROM org_facilities WHERE facility_code = 'HQ01'");
    facilityId = resFac[0].facility_id;

    // Departments
    const depts = [
      { code: 'SEC', name: 'Security' },
      { code: 'HR', name: 'Human Resources' },
      { code: 'ADMIN', name: 'Administration' },
      { code: 'MED', name: 'Medical/General' },
      { code: 'ICU', name: 'Intensive Care Unit' }
    ];
    for(const d of depts) {
      await pool.query('INSERT IGNORE INTO hr_departments (facility_id, department_code, department_name) VALUES (?, ?, ?)', [facilityId, d.code, d.name]);
    }

    const getDeptId = async (code: string) => {
      const [r]: any = await pool.query('SELECT department_id FROM hr_departments WHERE department_code = ? AND facility_id = ?', [code, facilityId]);
      return r.length > 0 ? r[0].department_id : null;
    }

    // 3. User Definitions
    const enterpriseUsers = [
      { username: 'super_admin', email: 'super_admin@nelsonhospital.com', pwd: 'password123', role: 'SUPER_ADMIN', empCode: 'EMP-SA', name: 'Super Admin', dept: 'ADMIN' },
      { username: 'ADMIN01', email: 'admin01@nelsonhospital.com', pwd: 'password123', role: 'ADMIN', empCode: 'EMP-ADM01', name: 'System Admin', dept: 'ADMIN' },
      { username: 'MGMT01', email: 'mgmt01@nelsonhospital.com', pwd: 'password123', role: 'ADMIN', empCode: 'EMP-MGMT01', name: 'Management User', dept: 'ADMIN' }, // Treating as Facility Admin for now
      { username: 'SECHOD01', email: 'sechod01@nelsonhospital.com', pwd: 'password123', role: 'SECURITY_HOD', empCode: 'EMP-SEC-HOD', name: 'Security Head', dept: 'SEC', deptRole: 'HOD' },
      { username: 'SEC01', email: 'sec01@nelsonhospital.com', pwd: 'password123', role: 'SECURITY_GUARD', empCode: 'EMP-SEC01', name: 'Security Guard', dept: 'SEC' },
      { username: 'HOD01', email: 'hod01@nelsonhospital.com', pwd: 'password123', role: 'HOD', empCode: 'EMP-HOD01', name: 'ICU HOD', dept: 'ICU', deptRole: 'HOD' },
      { username: 'HR01', email: 'hr01@nelsonhospital.com', pwd: 'password123', role: 'HR_MANAGER', empCode: 'EMP-HR01', name: 'HR Manager', dept: 'HR' },
      { username: 'EMP01', email: 'emp01@nelsonhospital.com', pwd: 'password123', role: 'EMPLOYEE', empCode: 'EMP-001', name: 'General Employee ONE', dept: 'MED' },
      { username: 'EMP02', email: 'emp02@nelsonhospital.com', pwd: 'password123', role: 'EMPLOYEE', empCode: 'EMP-002', name: 'General Employee TWO', dept: 'MED' }
    ];

    for (const eu of enterpriseUsers) {
      // Create user
      const hashedPassword = await bcrypt.hash(eu.pwd, 10);
      let userId;

      const [existingUser]: any = await pool.query('SELECT id FROM auth_users WHERE email = ?', [eu.email]);
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        await pool.query('UPDATE auth_users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
      } else {
        const [resU]: any = await pool.query(
          'INSERT INTO auth_users (username, email, password_hash, password_changed_at, failed_attempts) VALUES (?, ?, ?, NULL, 0)',
          [eu.username, eu.email, hashedPassword]
        );
        userId = resU.insertId;
      }

      // Assign Role
      const [rRows]: any = await pool.query('SELECT id FROM auth_roles WHERE role_code = ?', [eu.role]);
      if (rRows.length > 0) {
        await pool.query('INSERT IGNORE INTO auth_user_roles (user_id, role_id) VALUES (?, ?)', [userId, rRows[0].id]);
      }

      // Create Employee
      let empId;
      const [existingEmp]: any = await pool.query('SELECT employee_id FROM hr_employees WHERE employee_code = ?', [eu.empCode]);
      
      const deptId = await getDeptId(eu.dept);

      if (existingEmp.length > 0) {
        empId = existingEmp[0].employee_id;
        if (deptId) {
          await pool.query('UPDATE hr_employees SET department_id = ? WHERE employee_id = ?', [deptId, empId]);
        }
      } else {
        const [firstName, ...lastNames] = eu.name.split(' ');
        const [resE]: any = await pool.query(
          'INSERT INTO hr_employees (employee_code, first_name, last_name, department_id, email, employment_status) VALUES (?, ?, ?, ?, ?, ?)',
          [eu.empCode, firstName, lastNames.join(' '), deptId, eu.email, 'ACTIVE']
        );
        empId = resE.insertId;
      }

      // Map Employee -> User
      await pool.query('INSERT IGNORE INTO hr_employee_user_mapping (employee_id, user_id) VALUES (?, ?)', [empId, userId]);

      // Assign Facility Access
      await pool.query('INSERT IGNORE INTO employee_facility_access (employee_id, facility_id, default_facility) VALUES (?, ?, TRUE)', [empId, facilityId]);

      // Assign Department Role (if acting as HOD)
      if (eu.deptRole && deptId) {
        await pool.query('INSERT IGNORE INTO department_role_assignments (department_id, employee_id, assignment_role) VALUES (?, ?, ?)', [deptId, empId, eu.deptRole]);
      }

    }

    // Default Shift Master
    await pool.query("INSERT IGNORE INTO shift_master (facility_id, shift_name, shift_code, start_time, end_time) VALUES (?, 'Morning Shift', 'SHT-M', '08:00:00', '16:00:00')", [facilityId]);
    await pool.query("INSERT IGNORE INTO shift_master (facility_id, shift_name, shift_code, start_time, end_time) VALUES (?, 'Evening Shift', 'SHT-E', '16:00:00', '00:00:00')", [facilityId]);
    await pool.query("INSERT IGNORE INTO shift_master (facility_id, shift_name, shift_code, start_time, end_time) VALUES (?, 'Night Shift', 'SHT-N', '00:00:00', '08:00:00')", [facilityId]);

    // Give SEC01 a default shift for today
    const [secIdRes]: any = await pool.query("SELECT employee_id FROM hr_employees WHERE email = 'sec01@nelsonhospital.com'");
    if (secIdRes.length > 0) {
      const [shiftRes]: any = await pool.query("SELECT shift_id FROM shift_master WHERE shift_code = 'SHT-M'");
      if(shiftRes.length > 0) {
        // Just add an assignment from yesterday to roughly next year
        const d = new Date();
        const y = d.getFullYear();
        await pool.query("INSERT IGNORE INTO employee_shift_assignments (employee_id, shift_id, effective_from, effective_to) VALUES (?, ?, ?, ?)", [secIdRes[0].employee_id, shiftRes[0].shift_id, `${y}-01-01`, `${y+1}-01-01`]);
      }
    }


    console.log("== Enterprise User Seed Completed ==");

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
