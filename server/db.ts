import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const initDB = async () => {
  const schema = `
    SET FOREIGN_KEY_CHECKS = 0;

    -- SYSTEM DOMAIN
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(255) PRIMARY KEY,
      setting_value TEXT,
      setting_group VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS notification_templates (
      template_id INT AUTO_INCREMENT PRIMARY KEY,
      template_type VARCHAR(100) NOT NULL UNIQUE,
      subject VARCHAR(255),
      message_body TEXT
    );

    CREATE TABLE IF NOT EXISTS system_notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_user_id INT UNSIGNED,
      notification_type VARCHAR(100),
      message TEXT,
      delivery_status VARCHAR(50) DEFAULT 'PENDING',
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    );

    CREATE TABLE IF NOT EXISTS notification_queue (
      queue_id INT AUTO_INCREMENT PRIMARY KEY,
      notification_id INT NOT NULL,
      recipient_user_id INT UNSIGNED,
      channel VARCHAR(50) NOT NULL,
      payload JSON,
      status VARCHAR(50) DEFAULT 'QUEUED',
      retry_count INT DEFAULT 0,
      next_retry_at DATETIME,
      error_log TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (recipient_user_id) REFERENCES auth_users(id) ON DELETE SET NULL
    );

    -- GEO MASTER DOMAIN
    CREATE TABLE IF NOT EXISTS geo_countries (
      country_id INT AUTO_INCREMENT PRIMARY KEY,
      country_code VARCHAR(50) UNIQUE NOT NULL,
      country_name VARCHAR(100) NOT NULL,
      active_status BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS geo_states (
      state_id INT AUTO_INCREMENT PRIMARY KEY,
      country_id INT NOT NULL,
      state_code VARCHAR(50) NOT NULL,
      state_name VARCHAR(100) NOT NULL,
      active_status BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (country_id) REFERENCES geo_countries(country_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS geo_cities (
      city_id INT AUTO_INCREMENT PRIMARY KEY,
      state_id INT NOT NULL,
      city_code VARCHAR(50) NOT NULL,
      city_name VARCHAR(100) NOT NULL,
      tier_category VARCHAR(50),
      active_status BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (state_id) REFERENCES geo_states(state_id) ON DELETE CASCADE
    );

    -- FACILITY MASTER DOMAIN
    CREATE TABLE IF NOT EXISTS org_facilities (
      facility_id INT AUTO_INCREMENT PRIMARY KEY,
      facility_code VARCHAR(50) UNIQUE NOT NULL,
      facility_name VARCHAR(255) NOT NULL,
      facility_type VARCHAR(100),
      facility_category VARCHAR(100),
      country_id INT,
      state_id INT,
      city_id INT,
      address_line_1 TEXT,
      address_line_2 TEXT,
      pincode VARCHAR(20),
      contact_number VARCHAR(50),
      email VARCHAR(255),
      timezone VARCHAR(100),
      operational_status VARCHAR(50) DEFAULT 'ACTIVE',
      NABH_status VARCHAR(50),
      facility_logo VARCHAR(255),
      parent_facility_id INT NULL,
      regional_group VARCHAR(100) NULL,
      corporate_managed_flag BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (country_id) REFERENCES geo_countries(country_id) ON DELETE SET NULL,
      FOREIGN KEY (state_id) REFERENCES geo_states(state_id) ON DELETE SET NULL,
      FOREIGN KEY (city_id) REFERENCES geo_cities(city_id) ON DELETE SET NULL,
      FOREIGN KEY (parent_facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS facility_buildings (
      building_id INT AUTO_INCREMENT PRIMARY KEY,
      facility_id INT NOT NULL,
      building_name VARCHAR(255) NOT NULL,
      building_code VARCHAR(100) NOT NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS facility_floors (
      floor_id INT AUTO_INCREMENT PRIMARY KEY,
      building_id INT NOT NULL,
      floor_name VARCHAR(255) NOT NULL,
      floor_number VARCHAR(50),
      FOREIGN KEY (building_id) REFERENCES facility_buildings(building_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS facility_gates (
      gate_id INT AUTO_INCREMENT PRIMARY KEY,
      facility_id INT NOT NULL,
      gate_name VARCHAR(255) NOT NULL,
      gate_type VARCHAR(100),
      security_level VARCHAR(50),
      active_status BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE
    );

    -- AUTHENTICATION DOMAIN
    CREATE TABLE IF NOT EXISTS auth_users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_login DATETIME,
      password_changed_at DATETIME,
      failed_attempts INT DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    );

    CREATE TABLE IF NOT EXISTS auth_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(255) NOT NULL UNIQUE,
      role_code VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      active_status BOOLEAN DEFAULT TRUE,
      deleted_by INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (deleted_by) REFERENCES auth_users(id) ON DELETE SET NULL,
      INDEX idx_roles_active (active_status)
    );

    CREATE TABLE IF NOT EXISTS auth_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      permission_key VARCHAR(255) NOT NULL UNIQUE,
      module_name VARCHAR(100) NOT NULL,
      permission_group VARCHAR(100),
      description TEXT,
      active_status BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_perms_module (module_name),
      INDEX idx_perms_active (active_status)
    );

    CREATE TABLE IF NOT EXISTS auth_role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES auth_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES auth_permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_user_roles (
      user_id INT UNSIGNED NOT NULL,
      role_id INT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES auth_roles(id) ON DELETE CASCADE
    );

    -- EMPLOYEE DOMAIN
    CREATE TABLE IF NOT EXISTS hr_designations (
      designation_id INT AUTO_INCREMENT PRIMARY KEY,
      designation_name VARCHAR(255) NOT NULL,
      designation_code VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hr_departments (
      department_id INT AUTO_INCREMENT PRIMARY KEY,
      facility_id INT,
      department_code VARCHAR(100) NOT NULL,
      department_name VARCHAR(255) NOT NULL,
      department_type VARCHAR(100),
      parent_department_id INT,
      active_status BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE,
      FOREIGN KEY (parent_department_id) REFERENCES hr_departments(department_id) ON DELETE SET NULL,
      UNIQUE (facility_id, department_code)
    );

    CREATE TABLE IF NOT EXISTS hr_employees (
      employee_id INT AUTO_INCREMENT PRIMARY KEY,
      employee_code VARCHAR(100) UNIQUE NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      gender VARCHAR(20),
      DOB DATE,
      mobile VARCHAR(20),
      email VARCHAR(255),
      joining_date DATE,
      designation_id INT,
      department_id INT,
      reporting_manager_id INT,
      employment_status VARCHAR(50) DEFAULT 'ACTIVE',
      biometric_code VARCHAR(255),
      photo_url VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (designation_id) REFERENCES hr_designations(designation_id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE SET NULL,
      FOREIGN KEY (reporting_manager_id) REFERENCES hr_employees(employee_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shift_master (
      shift_id INT AUTO_INCREMENT PRIMARY KEY,
      facility_id INT NOT NULL,
      shift_name VARCHAR(100) NOT NULL,
      shift_code VARCHAR(50) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      grace_period_mins INT DEFAULT 15,
      active_status BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employee_postings (
      posting_id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      facility_id INT NOT NULL,
      department_id INT NOT NULL,
      designation_id INT NOT NULL,
      reporting_manager_id INT,
      effective_from DATE NOT NULL,
      effective_to DATE,
      active_status BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE CASCADE,
      FOREIGN KEY (designation_id) REFERENCES hr_designations(designation_id) ON DELETE CASCADE,
      FOREIGN KEY (reporting_manager_id) REFERENCES hr_employees(employee_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS employee_shift_assignments (
      assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      shift_id INT NOT NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      active_status BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES shift_master(shift_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS department_role_assignments (
      assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      department_id INT NOT NULL,
      employee_id INT NOT NULL,
      assignment_role VARCHAR(100) NOT NULL,
      priority_level INT DEFAULT 1,
      effective_from DATETIME,
      effective_to DATETIME,
      active_status BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_approval_matrix (
      matrix_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_type VARCHAR(100) NOT NULL,
      facility_id INT,
      department_id INT,
      approval_level INT NOT NULL,
      assignment_role VARCHAR(100) NOT NULL,
      mandatory_flag BOOLEAN DEFAULT TRUE,
      escalation_hours INT,
      active_status BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employee_facility_access (
      access_id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      facility_id INT NOT NULL,
      access_level VARCHAR(50),
      default_facility BOOLEAN DEFAULT FALSE,
      active_status BOOLEAN DEFAULT TRUE,
      temporary_deputation_flag BOOLEAN DEFAULT FALSE,
      valid_until DATETIME NULL,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hr_employee_user_mapping (
      employee_id INT NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      PRIMARY KEY (employee_id, user_id),
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visitor_types (
      type_id INT AUTO_INCREMENT PRIMARY KEY,
      type_name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      active_status BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS visitor_blacklist (
      blacklist_id INT AUTO_INCREMENT PRIMARY KEY,
      mobile VARCHAR(20) NOT NULL UNIQUE,
      reason TEXT NOT NULL,
      added_by INT UNSIGNED,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (added_by) REFERENCES auth_users(id) ON DELETE SET NULL
    );

    -- VISITOR DOMAIN
    CREATE TABLE IF NOT EXISTS visitor_master (
      visitor_id INT AUTO_INCREMENT PRIMARY KEY,
      visitor_type VARCHAR(100),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      mobile VARCHAR(20) NOT NULL,
      id_proof_type VARCHAR(100),
      id_proof_number VARCHAR(100),
      id_proof_url VARCHAR(255),
      address TEXT,
      blacklist_status BOOLEAN DEFAULT FALSE,
      remarks TEXT,
      photo_url VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX (mobile)
    );
    
    CREATE TABLE IF NOT EXISTS visitor_visits (
      visit_id INT AUTO_INCREMENT PRIMARY KEY,
      visitor_id INT NOT NULL,
      host_employee_id INT,
      department_id INT,
      purpose TEXT,
      check_in_time DATETIME,
      check_out_time DATETIME,
      status VARCHAR(50) DEFAULT 'CHECKED_IN',
      pass_number VARCHAR(100) UNIQUE,
      expected_exit_time DATETIME,
      qr_code_data TEXT,
      approved_by INT UNSIGNED,
      security_guard_id INT UNSIGNED,
      late_return BOOLEAN DEFAULT FALSE,
      facility_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (visitor_id) REFERENCES visitor_master(visitor_id) ON DELETE RESTRICT,
      FOREIGN KEY (host_employee_id) REFERENCES hr_employees(employee_id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by) REFERENCES auth_users(id) ON DELETE SET NULL,
      FOREIGN KEY (security_guard_id) REFERENCES auth_users(id) ON DELETE SET NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL,
      INDEX (pass_number)
    );

    -- GATEPASS DOMAIN
    CREATE TABLE IF NOT EXISTS gatepass_requests (
      request_id INT AUTO_INCREMENT PRIMARY KEY,
      request_type VARCHAR(100) NOT NULL,
      employee_id INT NOT NULL,
      reason TEXT,
      requested_exit_time DATETIME,
      expected_return_time DATETIME,
      current_status VARCHAR(50) DEFAULT 'PENDING',
      emergency_flag BOOLEAN DEFAULT FALSE,
      is_priority BOOLEAN DEFAULT FALSE,
      priority_reason TEXT,
      is_manually_escalated BOOLEAN DEFAULT FALSE,
      escalation_reason TEXT,
      escalation_target_role VARCHAR(50),
      escalation_timestamp DATETIME,
      qr_generated_at DATETIME,
      secret_pass_code VARCHAR(100),
      qr_token VARCHAR(255),
      cancelled_by INT UNSIGNED,
      cancelled_at DATETIME,
      cancellation_reason TEXT,
      facility_id INT,
      qr_code_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE RESTRICT,
      FOREIGN KEY (cancelled_by) REFERENCES auth_users(id) ON DELETE SET NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL,
      INDEX (current_status)
    );

    CREATE TABLE IF NOT EXISTS gatepass_approvals (
      approval_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      approval_level INT,
      approver_user_id INT UNSIGNED,
      action VARCHAR(50),
      remarks TEXT,
      action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (request_id) REFERENCES gatepass_requests(request_id) ON DELETE CASCADE,
      FOREIGN KEY (approver_user_id) REFERENCES auth_users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS gatepass_movements (
      movement_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      exit_time DATETIME,
      entry_time DATETIME,
      exit_gate_id INT,
      entry_gate_id INT,
      security_guard_id INT UNSIGNED,
      facility_id INT NULL,
      late_return BOOLEAN DEFAULT FALSE,
      verification_mode ENUM('QR_SCAN', 'MANUAL_CODE', 'BIOMETRIC', 'ADMIN_OVERRIDE', 'NFC') DEFAULT 'QR_SCAN',
      override_reason TEXT,
      verified_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (request_id) REFERENCES gatepass_requests(request_id) ON DELETE CASCADE,
      FOREIGN KEY (exit_gate_id) REFERENCES facility_gates(gate_id) ON DELETE SET NULL,
      FOREIGN KEY (entry_gate_id) REFERENCES facility_gates(gate_id) ON DELETE SET NULL,
      FOREIGN KEY (security_guard_id) REFERENCES auth_users(id) ON DELETE SET NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS gatepass_violations (
      violation_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      movement_id INT,
      violation_type VARCHAR(100) NOT NULL,
      severity VARCHAR(50) NOT NULL,
      description TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_status BOOLEAN DEFAULT FALSE,
      resolved_by INT UNSIGNED,
      resolution_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (request_id) REFERENCES gatepass_requests(request_id) ON DELETE CASCADE,
      FOREIGN KEY (movement_id) REFERENCES gatepass_movements(movement_id) ON DELETE SET NULL,
      FOREIGN KEY (resolved_by) REFERENCES auth_users(id) ON DELETE SET NULL
    );

    -- SECURITY DOMAIN
    CREATE TABLE IF NOT EXISTS security_devices (
      device_id INT AUTO_INCREMENT PRIMARY KEY,
      device_name VARCHAR(100) NOT NULL,
      device_type VARCHAR(50) NOT NULL,
      ip_address VARCHAR(100),
      mac_address VARCHAR(100) UNIQUE,
      facility_id INT,
      gate_id INT,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      last_ping DATETIME,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL,
      FOREIGN KEY (gate_id) REFERENCES facility_gates(gate_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS active_sessions (
      session_id VARCHAR(255) PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      device_id INT,
      ip_address VARCHAR(100),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_revoked BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
      FOREIGN KEY (device_id) REFERENCES security_devices(device_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS login_history (
      history_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      logout_time DATETIME,
      ip_address VARCHAR(100),
      user_agent TEXT,
      status VARCHAR(50) NOT NULL,
      failure_reason VARCHAR(255),
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS security_incidents (
      incident_id INT AUTO_INCREMENT PRIMARY KEY,
      incident_type VARCHAR(100),
      reported_by INT UNSIGNED,
      involved_person VARCHAR(255),
      description TEXT,
      severity VARCHAR(50),
      incident_time DATETIME,
      action_taken TEXT,
      facility_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reported_by) REFERENCES auth_users(id) ON DELETE SET NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS restricted_zones (
      zone_id INT AUTO_INCREMENT PRIMARY KEY,
      zone_name VARCHAR(255) NOT NULL,
      zone_code VARCHAR(100) UNIQUE NOT NULL,
      approval_required BOOLEAN DEFAULT TRUE,
      active_status BOOLEAN DEFAULT TRUE,
      facility_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS restricted_zone_access_logs (
      access_log_id INT AUTO_INCREMENT PRIMARY KEY,
      zone_id INT NOT NULL,
      person_type VARCHAR(50) NOT NULL,
      person_reference_id INT NOT NULL,
      access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_by INT UNSIGNED,
      violation_flag BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (zone_id) REFERENCES restricted_zones(zone_id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES auth_users(id) ON DELETE SET NULL
    );

    -- AUDIT DOMAIN
    CREATE TABLE IF NOT EXISTS audit_logs (
      audit_id INT AUTO_INCREMENT PRIMARY KEY,
      module_name VARCHAR(100),
      entity_name VARCHAR(100),
      entity_id INT,
      facility_id INT NULL,
      action_type VARCHAR(100) NOT NULL,
      old_value_json TEXT,
      new_value_json TEXT,
      action_by_user_id INT UNSIGNED,
      action_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      IP_address VARCHAR(100),
      device_info TEXT,
      FOREIGN KEY (action_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL,
      INDEX (action_timestamp)
    );

    CREATE TABLE IF NOT EXISTS vehicle_master (
      vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
      registration_number VARCHAR(100),
      vehicle_type VARCHAR(50),
      owner_name VARCHAR(100),
      owner_contact VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS vehicle_logs (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT,
      gate_id INT,
      entry_time DATETIME,
      exit_time DATETIME,
      purpose TEXT
    );

    CREATE TABLE IF NOT EXISTS visitor_appointments (
      appointment_id INT AUTO_INCREMENT PRIMARY KEY,
      visitor_id INT,
      host_id INT,
      appointment_time DATETIME,
      status VARCHAR(50) DEFAULT 'SCHEDULED'
    );

    CREATE TABLE IF NOT EXISTS visitor_logs (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      visitor_id INT,
      entry_time DATETIME,
      exit_time DATETIME,
      gate_id INT
    );

    CREATE TABLE IF NOT EXISTS asset_categories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS asset_master (
      asset_id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT,
      asset_name VARCHAR(255) NOT NULL,
      asset_code VARCHAR(100),
      facility_id INT,
      status VARCHAR(50) DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS asset_movements (
      movement_id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT,
      from_location VARCHAR(255),
      to_location VARCHAR(255),
      movement_time DATETIME,
      authorized_by INT
    );

    CREATE TABLE IF NOT EXISTS compliance_checklists (
      checklist_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contractor_master (
      contractor_id INT AUTO_INCREMENT PRIMARY KEY,
      contractor_name VARCHAR(255) NOT NULL,
      contact_number VARCHAR(50),
      company_name VARCHAR(255),
      facility_id INT,
      status VARCHAR(50) DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS contractor_attendance (
      attendance_id INT AUTO_INCREMENT PRIMARY KEY,
      contractor_id INT,
      check_in_time DATETIME,
      check_out_time DATETIME,
      gate_id INT
    );

    CREATE TABLE IF NOT EXISTS delegated_authority (
      delegation_id INT AUTO_INCREMENT PRIMARY KEY,
      delegator_id INT,
      delegatee_id INT,
      start_date DATETIME,
      end_date DATETIME,
      status VARCHAR(50) DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS emergency_incidents (
      incident_id INT AUTO_INCREMENT PRIMARY KEY,
      incident_type VARCHAR(100),
      description TEXT,
      reported_by INT,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS facility_security_policies (
      policy_id INT AUTO_INCREMENT PRIMARY KEY,
      policy_name VARCHAR(255),
      facility_id INT,
      details TEXT,
      active_status BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS gate_master (
      gate_id INT AUTO_INCREMENT PRIMARY KEY,
      gate_name VARCHAR(255),
      facility_id INT,
      gate_type VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS gate_traffic (
      traffic_id INT AUTO_INCREMENT PRIMARY KEY,
      gate_id INT,
      vehicle_id INT,
      direction VARCHAR(50),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS policy_documents (
      document_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255),
      document_url VARCHAR(255),
      uploaded_by INT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS restricted_zone_access_requests (
      request_id INT AUTO_INCREMENT PRIMARY KEY,
      zone_id INT,
      requester_id INT,
      reason TEXT,
      status VARCHAR(50) DEFAULT 'PENDING',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shift_overrides (
      override_id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT,
      shift_id INT,
      override_date DATE,
      reason TEXT,
      approved_by INT
    );

    SET FOREIGN_KEY_CHECKS = 1;
  `;
  
  try {
    const statements = schema.split(';').filter((stmt) => stmt.trim() !== '');
    for (const stmt of statements) {
        await pool.query(stmt);
    }
    console.log('Enterprise Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database', error);
    throw error;
  }
};

export default pool;
