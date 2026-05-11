import db from './server/db.js';

async function runUpdate() {
  const migrations = [
    // 1. Add facility_id to gatepass_movements if missing
    "ALTER TABLE gatepass_movements ADD COLUMN facility_id INT NULL",
    "ALTER TABLE gatepass_movements ADD CONSTRAINT fk_gp_mov_facility FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL",
    
    // 2. Ensure foreign keys for audit_logs
    "ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_facility FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL",
    
    // 3. Ensure foreign keys for gatepass_requests
    "ALTER TABLE gatepass_requests ADD CONSTRAINT fk_gp_req_facility FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL",
    
    // 4. Ensure foreign keys for security_incidents
    "ALTER TABLE security_incidents ADD CONSTRAINT fk_sec_inc_facility FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL",
    
    // 5. Ensure foreign keys for restricted_zones
    "ALTER TABLE restricted_zones ADD CONSTRAINT fk_rest_zones_fac FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL",

    // 6. Modify org_facilities
    "ALTER TABLE org_facilities ADD COLUMN parent_facility_id INT NULL",
    "ALTER TABLE org_facilities ADD COLUMN regional_group VARCHAR(100) NULL",
    "ALTER TABLE org_facilities ADD COLUMN corporate_managed_flag BOOLEAN DEFAULT FALSE",
    "ALTER TABLE org_facilities ADD CONSTRAINT fk_parent_facility FOREIGN KEY (parent_facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL",
    
    // 7. Update employee_facility_access
    "ALTER TABLE employee_facility_access ADD COLUMN temporary_deputation_flag BOOLEAN DEFAULT FALSE",
    "ALTER TABLE employee_facility_access ADD COLUMN valid_until DATETIME NULL"
  ];

  for (const sql of migrations) {
    try {
      await db.query(sql);
      console.log(`✅ Executed: ${sql}`);
    } catch (e: any) {
      if (
        e.code === 'ER_DUP_FIELDNAME' || 
        e.code === 'ER_DUP_KEYNAME' || 
        e.code === 'ER_CANT_DROP_FIELD_OR_KEY' || 
        e.code === 'ER_TABLE_EXISTS_ERROR' ||
        e.code === 'ER_ADD_CONSTRAINT' || 
        e.message.includes("Duplicate foreign key constraint name")
      ) {
        console.log(`⏭️ Skipped (already exists): ${sql}`);
      } else {
        console.error(`❌ Error executing: ${sql}\n${e.message}`);
      }
    }
  }

  process.exit(0);
}

runUpdate();
