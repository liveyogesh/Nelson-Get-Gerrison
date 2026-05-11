import bcrypt from 'bcryptjs';
import db, { initDB } from './db.js';

const seed = async () => {
  await initDB();

  try {
    // 1. Seed Geo Data
    console.log('Seeding geo data...');
    let countryId = 1;
    let stateId = 1;
    let cityId = 1;
    let facilityId = 1;

    const [countryCount]: any = await db.query('SELECT COUNT(*) as count FROM geo_countries');
    if (countryCount[0].count === 0) {
      const [cRes]: any = await db.execute('INSERT INTO geo_countries (country_code, country_name) VALUES (?, ?)', ['IN', 'India']);
      countryId = cRes.insertId;
      const [sRes]: any = await db.execute('INSERT INTO geo_states (country_id, state_code, state_name) VALUES (?, ?, ?)', [countryId, 'MH', 'Maharashtra']);
      stateId = sRes.insertId;
      const [cityRes]: any = await db.execute('INSERT INTO geo_cities (state_id, city_code, city_name) VALUES (?, ?, ?)', [stateId, 'MUM', 'Mumbai']);
      cityId = cityRes.insertId;
    } else {
      const [countries]: any = await db.query('SELECT country_id FROM geo_countries LIMIT 1');
      countryId = countries[0].country_id;
      const [states]: any = await db.query('SELECT state_id FROM geo_states LIMIT 1');
      stateId = states[0].state_id;
      const [cities]: any = await db.query('SELECT city_id FROM geo_cities LIMIT 1');
      cityId = cities[0].city_id;
    }

    // 1b. Seed Facility
    const [facilityCountResult]: any = await db.query('SELECT COUNT(*) as count FROM org_facilities');
    if (facilityCountResult[0].count === 0) {
      console.log('Seeding facility...');
      const [facilityResult]: any = await db.execute(
        'INSERT INTO org_facilities (facility_code, facility_name, country_id, state_id, city_id, address_line_1) VALUES (?, ?, ?, ?, ?, ?)',
        ['NH-MAIN', 'Nelson Hospital Main', countryId, stateId, cityId, '123 Medical Way']
      );
      facilityId = facilityResult.insertId;
    } else {
      const [facilities]: any = await db.query('SELECT facility_id FROM org_facilities LIMIT 1');
      facilityId = facilities[0].facility_id;
    }

    // 2. Seed Roles
    const [rolesCountResult]: any = await db.query('SELECT COUNT(*) as count FROM auth_roles');
    let adminRoleId = 1;
    if (rolesCountResult[0].count === 0) {
      console.log('Seeding roles...');
      const roles = [
        { name: 'Super Admin', code: 'SUPER_ADMIN' },
        { name: 'HR Admin', code: 'HR_ADMIN' },
        { name: 'HOD', code: 'HOD' },
        { name: 'Security Guard', code: 'SECURITY_GUARD' },
        { name: 'Employee', code: 'EMPLOYEE' }
      ];
      for (const role of roles) {
        const [res]: any = await db.execute('INSERT INTO auth_roles (role_name, role_code) VALUES (?, ?)', [role.name, role.code]);
        if (role.code === 'SUPER_ADMIN') {
          adminRoleId = res.insertId;
        }
      }
    } else {
      const [roles]: any = await db.execute('SELECT id FROM auth_roles WHERE role_code = ?', ['SUPER_ADMIN']);
      if (roles.length > 0) adminRoleId = roles[0].id;
    }

    // 3. Seed Department
    const [deptCountResult]: any = await db.query('SELECT COUNT(*) as count FROM hr_departments');
    let deptId = 1;
    if (deptCountResult[0].count === 0) {
      console.log('Seeding department...');
      const [deptResult]: any = await db.execute(
        'INSERT INTO hr_departments (department_name, department_code, facility_id) VALUES (?, ?, ?)',
        ['Administration', 'ADMIN', facilityId]
      );
      deptId = deptResult.insertId;
    } else {
      const [depts]: any = await db.query('SELECT department_id FROM hr_departments LIMIT 1');
      deptId = depts[0].department_id;
    }

    // 4. Seed Designation
    const [desigCountResult]: any = await db.query('SELECT COUNT(*) as count FROM hr_designations');
    let desigId = 1;
    if (desigCountResult[0].count === 0) {
      console.log('Seeding designation...');
      const [desigResult]: any = await db.execute(
        'INSERT INTO hr_designations (designation_name, designation_code) VALUES (?, ?)',
        ['Administrator', 'ADMIN']
      );
      desigId = desigResult.insertId;
    } else {
      const [desigs]: any = await db.query('SELECT designation_id FROM hr_designations LIMIT 1');
      desigId = desigs[0].designation_id;
    }

    // 5. Check Super Admin Auth User
    const [adminCountResult]: any = await db.query('SELECT COUNT(*) as count FROM auth_users WHERE email = ?', ['admin@nelsonhospital.com']);
    let adminUserId = 1;
    if (adminCountResult[0].count === 0) {
      console.log('Seeding super admin user...');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      const [userResult]: any = await db.execute(
        'INSERT INTO auth_users (username, email, password_hash) VALUES (?, ?, ?)',
        ['admin', 'admin@nelsonhospital.com', hashedPassword]
      );
      adminUserId = userResult.insertId;

      await db.execute(
        'INSERT INTO auth_user_roles (user_id, role_id) VALUES (?, ?)',
        [adminUserId, adminRoleId]
      );
      console.log('Super Admin user created: admin@nelsonhospital.com / Admin@123');

      // 6. Create HR Employee record for the admin
      const [empResult]: any = await db.execute(
        'INSERT INTO hr_employees (employee_code, first_name, department_id, designation_id) VALUES (?, ?, ?, ?)',
        ['EMP-ADMIN-001', 'System Admin', deptId, desigId]
      );
      
      // Give employee access to facility
      await db.execute(
        'INSERT INTO employee_facility_access (employee_id, facility_id, access_level, default_facility) VALUES (?, ?, ?, ?)',
        [empResult.insertId, facilityId, 'ALL', true]
      );

      // 7. Map employee to user
      await db.execute(
        'INSERT INTO hr_employee_user_mapping (employee_id, user_id) VALUES (?, ?)',
        [empResult.insertId, adminUserId]
      );
    }
    
    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
