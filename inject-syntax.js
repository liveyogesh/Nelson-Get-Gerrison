import fs from 'fs';

let content = `
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
      reporting_manager_id INT, /* Self reference */
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
      assignment_role VARCHAR(100) NOT NULL, /* HOD, Supervisor, Approver */
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
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hr_employee_user_mapping (
      employee_id INT NOT NULL,
      user_id INT NOT NULL,
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
      added_by INT,
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
      approved_by INT,
      security_guard_id INT,
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
      facility_id INT,
      qr_code_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE RESTRICT,
      FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id) ON DELETE SET NULL,
      INDEX (current_status)
    );

    CREATE TABLE IF NOT EXISTS gatepass_approvals (
      approval_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      approval_level INT,
      approver_user_id INT,
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
      security_guard_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      FOREIGN KEY (request_id) REFERENCES gatepass_requests(request_id) ON DELETE CASCADE,
      FOREIGN KEY (exit_gate_id) REFERENCES facility_gates(gate_id) ON DELETE SET NULL,
      FOREIGN KEY (entry_gate_id) REFERENCES facility_gates(gate_id) ON DELETE SET NULL,
      FOREIGN KEY (security_guard_id) REFERENCES auth_users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS gatepass_violations (
      violation_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      movement_id INT,
      violation_type VARCHAR(100) NOT NULL, /* LATE_RETURN, QUOTA_EXCEEDED, RESTRICTED_ZONE_ACCESS */
      severity VARCHAR(50) NOT NULL,
      description TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_status BOOLEAN DEFAULT FALSE,
      resolved_by INT,
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
      device_type VARCHAR(50) NOT NULL, /* TABLET, SCANNER, BIOMETRIC, CCTV */
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
      user_id INT NOT NULL,
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
      user_id INT NOT NULL,
      login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      logout_time DATETIME,
      ip_address VARCHAR(100),
      user_agent TEXT,
      status VARCHAR(50) NOT NULL, /* SUCCESS, FAILED, LOCKED */
      failure_reason VARCHAR(255),
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS security_incidents (
      incident_id INT AUTO_INCREMENT PRIMARY KEY,
      incident_type VARCHAR(100),
      reported_by INT,
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
      person_type VARCHAR(50) NOT NULL, /* EMPLOYEE, VISITOR */
      person_reference_id INT NOT NULL, /* ID from hr_employees or visitor_master */
      access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_by INT,
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
      action_type VARCHAR(100) NOT NULL,
      old_value_json TEXT,
      new_value_json TEXT,
      action_by_user_id INT,
      action_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      IP_address VARCHAR(100),
      device_info TEXT,
      FOREIGN KEY (action_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
      INDEX (action_timestamp)
    );
`;

let code = fs.readFileSync('server/db.ts', 'utf8');

// The original file is a total mess in this section. Let's replace everything from "-- EMPLOYEE DOMAIN" to "-- AUDIT DOMAIN... SET FOREIGN_KEY_CHECKS = 1;"
const regex = /-- EMPLOYEE DOMAIN[\s\S]*?SET FOREIGN_KEY_CHECKS = 1;/gm;

code = code.replace(regex, content.trim() + '\n\n    SET FOREIGN_KEY_CHECKS = 1;');

fs.writeFileSync('server/db.ts', code);
