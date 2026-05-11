import db from './server/db.js';

async function runMigration() {
  console.log("== Starting Enterprise Migration & Hardening ==");

  const migrations = [
    // 1. Audit Immutability Constraints
    // Note: In MySQL, true immutability is handled via triggers mapped to SIGNAL SQLSTATE '45000'
    `CREATE TRIGGER IF NOT EXISTS prevent_audit_update BEFORE UPDATE ON audit_logs 
     FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are append-only. UPDATE forbidden.'; END;`,
    `CREATE TRIGGER IF NOT EXISTS prevent_audit_delete BEFORE DELETE ON audit_logs 
     FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable. DELETE forbidden.'; END;`,

    // 2. Role hierarchies & Auth Permissions Matrix
    `CREATE TABLE IF NOT EXISTS auth_permissions (
      permission_id INT AUTO_INCREMENT PRIMARY KEY,
      permission_code VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS auth_role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES auth_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES auth_permissions(permission_id) ON DELETE CASCADE
    )`,

    // 3. Shift-based access
    `ALTER TABLE employee_shift_assignments
     ADD COLUMN IF NOT EXISTS effective_from DATE NULL,
     ADD COLUMN IF NOT EXISTS effective_to DATE NULL,
     ADD COLUMN IF NOT EXISTS overrides_allowed BOOLEAN DEFAULT FALSE`,
    
    // 4. Session & Login Governance
    `ALTER TABLE auth_users 
     ADD COLUMN IF NOT EXISTS password_changed_at DATETIME NULL,
     ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT FALSE,
     ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
     ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255) NULL`,
    
    // 5. Active Sessions Tracking
    `ALTER TABLE active_sessions
     ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(255) NULL,
     ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100) NULL,
     ADD COLUMN IF NOT EXISTS suspicious_flag BOOLEAN DEFAULT FALSE`,

    // 6. Enterprise Notification Engine
    `CREATE TABLE IF NOT EXISTS notification_templates (
      template_id INT AUTO_INCREMENT PRIMARY KEY,
      template_code VARCHAR(100) UNIQUE NOT NULL,
      template_type ENUM('SMS', 'EMAIL', 'WHATSAPP', 'IN_APP') NOT NULL,
      content_body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notification_queue (
      queue_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      template_id INT NOT NULL,
      recipient_identifier VARCHAR(255) NOT NULL,
      payload JSON NOT NULL,
      status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
      retry_count INT DEFAULT 0,
      next_retry_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
      FOREIGN KEY (template_id) REFERENCES notification_templates(template_id)
    )`,

    // 7. Gatepass Enterprise additions
    `ALTER TABLE gatepass_requests 
     ADD COLUMN IF NOT EXISTS secret_pass_code VARCHAR(255) NULL,
     ADD COLUMN IF NOT EXISTS qr_token VARCHAR(500) NULL`,
    
    `ALTER TABLE gatepass_movements 
     ADD COLUMN IF NOT EXISTS verification_mode ENUM('QR', 'MANUAL_CODE', 'OVERRIDE', 'BIOMETRIC') DEFAULT 'QR',
     ADD COLUMN IF NOT EXISTS override_reason VARCHAR(255) NULL`,

    // 8. Add Indices to performance-critical lookup tables
    `CREATE INDEX IF NOT EXISTS idx_audit_facility ON audit_logs(facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_name, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gatepass_facility ON gatepass_requests(facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hr_user_mapping ON hr_employee_user_mapping(user_id, employee_id)`
  ];

  for (const sql of migrations) {
    try {
      if (sql.trim() === '') continue;
      await db.query(sql);
      console.log(`[SUCCESS] executing: ${sql.substring(0, 50)}...`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log(`[SKIPPED] already exists: ${sql.substring(0, 50)}...`);
      } else {
        console.error(`[ERROR] executing: ${sql}\nReason: ${e.message}`);
      }
    }
  }

  console.log("== Enterprise Migration Complete ==");
  process.exit(0);
}

runMigration();
