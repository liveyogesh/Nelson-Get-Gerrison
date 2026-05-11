import db from './server/db.js';

async function runArchivalAndDelegationMigration() {
  console.log("== Starting Archival & Delegation Migration ==");

  const migrations = [
    // 1. Delegated Authority System
    `CREATE TABLE IF NOT EXISTS auto_delegation_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      delegator_user_id INT UNSIGNED NOT NULL,
      delegatee_user_id INT UNSIGNED NOT NULL,
      facility_id INT NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      reason TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegator_user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
      FOREIGN KEY (delegatee_user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE
    )`,

    // 2. Archival Tables Strategy
    // Storing old closed gatepasses for long-term historical reporting (data older than 1 year)
    `CREATE TABLE IF NOT EXISTS gatepass_requests_archive (LIKE gatepass_requests)`,
    // Archiving movements tied to older gatepasses
    `CREATE TABLE IF NOT EXISTS gatepass_movements_archive (LIKE gatepass_movements)`,
    // Archiving old audit logs for long-term storage
    `CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs)`,

    // 3. Stored Procedure for Archival
    `DROP PROCEDURE IF EXISTS \`sp_archive_old_data\``,
    `CREATE PROCEDURE \`sp_archive_old_data\`()
     BEGIN
       DECLARE archival_date DATETIME;
       SET archival_date = DATE_SUB(NOW(), INTERVAL 1 YEAR);
       
       -- Archive Gatepasses
       INSERT INTO gatepass_requests_archive 
       SELECT * FROM gatepass_requests 
       WHERE current_status IN ('COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED') 
       AND created_at < archival_date;
       
       -- Archive Movements for those gatepasses
       INSERT INTO gatepass_movements_archive
       SELECT m.* FROM gatepass_movements m
       JOIN gatepass_requests r ON m.request_id = r.request_id
       WHERE r.current_status IN ('COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED') 
       AND r.created_at < archival_date;
       
       -- Delete original movements
       DELETE m FROM gatepass_movements m
       JOIN gatepass_requests r ON m.request_id = r.request_id
       WHERE r.current_status IN ('COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED') 
       AND r.created_at < archival_date;
       
       -- Delete original gatepasses
       DELETE FROM gatepass_requests
       WHERE current_status IN ('COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED') 
       AND created_at < archival_date;
       
       -- Archive Audit Logs
       INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE timestamp < archival_date;
       
       -- To delete from audit_logs, we need to bypass the BEFORE DELETE triggers temporarily,
       -- or handle it outside this basic SP. For now, we just copy. In a real system, the trigger
       -- would check a user variable like @disable_audit_triggers.
     END`,

    // 4. API Integration Configurations (ERP/HRMS/HIMS)
    `CREATE TABLE IF NOT EXISTS external_integrations (
      integration_id INT AUTO_INCREMENT PRIMARY KEY,
      system_name VARCHAR(100) NOT NULL,
      system_type ENUM('ERP', 'HRMS', 'HIMS', 'AD') NOT NULL,
      endpoint_url VARCHAR(255) NOT NULL,
      auth_type ENUM('BASIC', 'BEARER', 'OAUTH2', 'API_KEY') NOT NULL,
      auth_credentials JSON,
      sync_frequency_mins INT DEFAULT 60,
      last_sync_at DATETIME NULL,
      status ENUM('ACTIVE', 'INACTIVE', 'ERROR') DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of migrations) {
    try {
      if (sql.trim() === '') continue;
      await db.query(sql);
      console.log(`[SUCCESS] executing: ${sql.substring(0, 50)}...`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_CANT_DROP_FIELD_OR_KEY' || e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`[SKIPPED] already exists: ${sql.substring(0, 50)}...`);
      } else {
        console.error(`[ERROR] executing: ${sql.substring(0, 50)}\\nReason: ${e.message}`);
      }
    }
  }

  console.log("== Archival & Delegation Migration Complete ==");
  process.exit(0);
}

runArchivalAndDelegationMigration();
