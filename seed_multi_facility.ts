import db from './server/db.js';

async function run() {
  try {
    console.log("== Starting Multi-Facility Governance Setup ==");

    // 1. Alter org_facilities
    try {
      await db.query(`ALTER TABLE org_facilities 
        ADD COLUMN parent_facility_id INT NULL,
        ADD COLUMN regional_group VARCHAR(100) NULL,
        ADD COLUMN corporate_managed_flag BOOLEAN DEFAULT FALSE;`);
      console.log("Altered org_facilities.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    try {
        await db.query(`ALTER TABLE org_facilities ADD CONSTRAINT fk_parent_facility FOREIGN KEY (parent_facility_id) REFERENCES org_facilities(facility_id);`);
    } catch (e: any) {
    }

    // 2. Alter employee_facility_access
    try {
      await db.query(`ALTER TABLE employee_facility_access 
        ADD COLUMN temporary_deputation_flag BOOLEAN DEFAULT FALSE,
        ADD COLUMN valid_until DATE NULL;`);
      console.log("Altered employee_facility_access.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // 3. Alter audit_logs
    try {
      await db.query(`ALTER TABLE audit_logs ADD COLUMN facility_id INT NULL;`);
      console.log("Altered audit_logs.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // 4. Alter workflow_approval_matrix
    try {
      await db.query(`ALTER TABLE workflow_approval_matrix ADD COLUMN facility_isolation BOOLEAN DEFAULT TRUE;`);
      console.log("Altered workflow_approval_matrix.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // 5. Alter security_devices
    try {
      await db.query(`ALTER TABLE security_devices 
        ADD COLUMN trusted_network VARCHAR(255) NULL,
        ADD COLUMN heartbeat_timestamp TIMESTAMP NULL;`);
      console.log("Altered security_devices.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // Seeding Corporate Hierarchy
    // Get existing country/state/city from MAIN facility
    const [hq]: any = await db.query(`SELECT * FROM org_facilities WHERE facility_code = 'HQ01'`);
    if (hq.length > 0) {
      const country_id = hq[0].country_id;
      const state_id = hq[0].state_id;
      const city_id = hq[0].city_id;

      // Corporate Office
      await db.query(`INSERT IGNORE INTO org_facilities (facility_code, facility_name, facility_category, facility_type, country_id, state_id, city_id, corporate_managed_flag) 
        VALUES ('CORP-HQ', 'Nelson Corporate Office', 'CORPORATE', 'HEADQUARTERS', ?, ?, ?, TRUE)`, 
        [country_id, state_id, city_id]);

      const [corp]: any = await db.query(`SELECT facility_id FROM org_facilities WHERE facility_code = 'CORP-HQ'`);
      const corpId = corp[0].facility_id;

      // set HQ01's parent to corporate office
      await db.query(`UPDATE org_facilities SET parent_facility_id = ?, regional_group = 'WEST' WHERE facility_code = 'HQ01'`, [corpId]);

      // Seed Clinics/Other Hospitals
      await db.query(`INSERT IGNORE INTO org_facilities (facility_code, facility_name, facility_category, facility_type, country_id, state_id, city_id, parent_facility_id, regional_group) 
        VALUES 
        ('NCI-01', 'Nelson Cancer Institute', 'HOSPITAL', 'SPECIALTY', ?, ?, ?, ?, 'WEST'),
        ('ND-01', 'Nelson Diagnostics Mumbai', 'CLINIC', 'DIAGNOSTIC', ?, ?, ?, ?, 'WEST')`, 
        [country_id, state_id, city_id, corpId, country_id, state_id, city_id, corpId]
      );
      
      console.log("Seeded multi-facility definitions.");

      // Set facility_id in employee_facility_access if not present. Already handled in previous scripts but we can update Super Admin to Corporate.
      const [superAdminUser]: any = await db.query(`SELECT hr.employee_id FROM hr_employees hr JOIN auth_users au ON hr.email = au.email WHERE au.username = 'super_admin'`);
      if (superAdminUser.length > 0) {
        const saEmpId = superAdminUser[0].employee_id;
        await db.query(`INSERT IGNORE INTO employee_facility_access (employee_id, facility_id, access_level, default_facility) VALUES (?, ?, 'FULL', FALSE)`, [saEmpId, corpId]);
      }
      
      // Seed some security policies
      const [allHospitals]: any = await db.query(`SELECT facility_id, facility_code FROM org_facilities`);
      for (const fac of allHospitals) {
        let gatePolicy = JSON.stringify({ allow_24x7: false, open_time: '06:00', close_time: '23:00' });
        if (fac.facility_code === 'HQ01') {
            gatePolicy = JSON.stringify({ allow_24x7: true });
        }
        await db.query(`INSERT IGNORE INTO facility_security_policies (facility_id, policy_name, details) VALUES (?, 'GATE_TIMING', ?)`, [fac.facility_id, gatePolicy]);
      }
    }

    console.log("== Multi-Facility Governance Setup Complete ==");
  } catch (error) {
    console.error('Error during setup:', error);
  } finally {
    process.exit(0);
  }
}

run();
