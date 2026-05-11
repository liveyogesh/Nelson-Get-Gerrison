import db from './server/db.js';

async function runEnterpriseFinalHardening() {
  console.log("== Starting Final Enterprise Schema Hardening ==");

  const migrations = [
    // 1. Emergency Lockdown Governance
    `CREATE TABLE IF NOT EXISTS emergency_lockdowns (
      lockdown_id INT AUTO_INCREMENT PRIMARY KEY,
      facility_id INT NOT NULL,
      initiated_by INT UNSIGNED NOT NULL,
      reason TEXT NOT NULL,
      lockdown_level ENUM('PARTIAL', 'FULL', 'CUSTOM') DEFAULT 'FULL',
      status ENUM('ACTIVE', 'RESOLVED') DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL,
      resolved_by INT UNSIGNED NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE,
      FOREIGN KEY (initiated_by) REFERENCES auth_users(id),
      FOREIGN KEY (resolved_by) REFERENCES auth_users(id)
    );`,
    
    `CREATE TABLE IF NOT EXISTS lockdown_gate_rules (
      rule_id INT AUTO_INCREMENT PRIMARY KEY,
      lockdown_id INT NOT NULL,
      target_gate_id INT NULL,
      action ENUM('BLOCK_ALL', 'ALLOW_EMERGENCY_ONLY', 'ALLOW_EXIT_ONLY') NOT NULL,
      FOREIGN KEY (lockdown_id) REFERENCES emergency_lockdowns(lockdown_id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS emergency_broadcasts (
      broadcast_id INT AUTO_INCREMENT PRIMARY KEY,
      lockdown_id INT NOT NULL,
      message TEXT NOT NULL,
      broadcast_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lockdown_id) REFERENCES emergency_lockdowns(lockdown_id) ON DELETE CASCADE
    );`,

    // 2. Compliance Governance
    `CREATE TABLE IF NOT EXISTS policy_versions (
      policy_id INT AUTO_INCREMENT PRIMARY KEY,
      policy_name VARCHAR(255) NOT NULL,
      version VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      effective_date DATE NOT NULL,
      expiry_date DATE NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS employee_policy_acknowledgements (
      ack_id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      policy_id INT NOT NULL,
      acknowledged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(100),
      device_info TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (policy_id) REFERENCES policy_versions(policy_id) ON DELETE CASCADE,
      UNIQUE (employee_id, policy_id)
    );`,

    `CREATE TABLE IF NOT EXISTS compliance_audit_mappings (
      mapping_id INT AUTO_INCREMENT PRIMARY KEY,
      policy_id INT NOT NULL,
      audit_id INT NOT NULL,
      FOREIGN KEY (policy_id) REFERENCES policy_versions(policy_id) ON DELETE CASCADE,
      FOREIGN KEY (audit_id) REFERENCES audit_logs(audit_id) ON DELETE CASCADE
    );`,

    // 3. Shift Governance Extensions
    `CREATE TABLE IF NOT EXISTS active_shift_sessions (
      shift_session_id INT AUTO_INCREMENT PRIMARY KEY,
      assignment_id INT NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      clock_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      clock_out_time DATETIME NULL,
      device_id INT NULL,
      FOREIGN KEY (assignment_id) REFERENCES employee_shift_assignments(assignment_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS shift_handover_logs (
      handover_id INT AUTO_INCREMENT PRIMARY KEY,
      outgoing_user_id INT UNSIGNED NOT NULL,
      incoming_user_id INT UNSIGNED NOT NULL,
      facility_id INT NOT NULL,
      handover_notes TEXT,
      key_incidents_flag BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (outgoing_user_id) REFERENCES auth_users(id),
      FOREIGN KEY (incoming_user_id) REFERENCES auth_users(id),
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
    );`,

    // 4. Restricted Zone Approvals & Overrides
    `CREATE TABLE IF NOT EXISTS restricted_zone_approvals (
      approval_id INT AUTO_INCREMENT PRIMARY KEY,
      zone_id INT NOT NULL,
      person_reference_id INT NOT NULL,
      person_type ENUM('EMPLOYEE', 'VISITOR') NOT NULL,
      approved_by INT UNSIGNED NOT NULL,
      valid_until DATETIME NOT NULL,
      status ENUM('ACTIVE', 'REVOKED', 'EXPIRED') DEFAULT 'ACTIVE',
      FOREIGN KEY (zone_id) REFERENCES restricted_zones(zone_id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES auth_users(id)
    );`,

    `CREATE TABLE IF NOT EXISTS restricted_zone_override_logs (
      override_id INT AUTO_INCREMENT PRIMARY KEY,
      zone_id INT NOT NULL,
      person_reference_id INT NOT NULL,
      person_type ENUM('EMPLOYEE', 'VISITOR') NOT NULL,
      guard_id INT UNSIGNED NOT NULL,
      override_reason TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES restricted_zones(zone_id) ON DELETE CASCADE,
      FOREIGN KEY (guard_id) REFERENCES auth_users(id)
    );`,

    // 5. Index Optimizations
    `CREATE INDEX IF NOT EXISTS idx_gp_req_emp_status ON gatepass_requests(employee_id, current_status);`,
    `CREATE INDEX IF NOT EXISTS idx_gp_req_created ON gatepass_requests(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_action_ts ON audit_logs(action_timestamp);`
  ];

  for (const sql of migrations) {
    try {
      if (sql.trim() === '') continue;
      await db.query(sql);
      console.log(`[SUCCESS] executed: ${sql.substring(0, 40)}...`);
    } catch (e: any) {
      if (['ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME', 'ER_TABLE_EXISTS_ERROR'].includes(e.code)) {
        console.log(`[SKIPPED] already exists: ${sql.substring(0, 40)}...`);
      } else {
        console.error(`[ERROR] executing: ${sql.substring(0, 40)}...\\nReason: ${e.message}`);
      }
    }
  }

  console.log("== Final Enterprise Schema Hardening Complete ==");
  process.exit(0);
}

runEnterpriseFinalHardening();
