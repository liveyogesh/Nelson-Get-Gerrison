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
      recipient_user_id INT,
      notification_type VARCHAR(100),
      message TEXT,
      delivery_status VARCHAR(50) DEFAULT 'PENDING',
      sent_at DATETIME
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (country_id) REFERENCES geo_countries(country_id) ON DELETE SET NULL,
      FOREIGN KEY (state_id) REFERENCES geo_states(state_id) ON DELETE SET NULL,
      FOREIGN KEY (city_id) REFERENCES geo_cities(city_id) ON DELETE SET NULL
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
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_login DATETIME,
      password_changed_at DATETIME,
      failed_attempts INT DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(255) NOT NULL UNIQUE,
      role_code VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      permission_key VARCHAR(255) NOT NULL UNIQUE,
      module_name VARCHAR(100) NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES auth_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES auth_permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_user_roles (
      user_id INT NOT NULL,
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
      FOREIGN KEY (designation_id) REFERENCES hr_designations(designation_id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE SET NULL,
      FOREIGN KEY (reporting_manager_id) REFERENCES hr_employees(employee_id) ON DELETE SET NULL
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

    -- VISITOR DOMAIN
    CREATE TABLE IF NOT EXISTS visitor_master (
      visitor_id INT AUTO_INCREMENT PRIMARY KEY,
      visitor_type VARCHAR(100),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      mobile VARCHAR(20) NOT NULL,
      id_proof_type VARCHAR(100),
      id_proof_number VARCHAR(100),
      address TEXT,
      blacklist_status BOOLEAN DEFAULT FALSE,
      remarks TEXT,
      photo_url VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
      approved_by INT,
      security_guard_id INT,
      facility_id INT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
      FOREIGN KEY (request_id) REFERENCES gatepass_requests(request_id) ON DELETE CASCADE,
      FOREIGN KEY (exit_gate_id) REFERENCES facility_gates(gate_id) ON DELETE SET NULL,
      FOREIGN KEY (entry_gate_id) REFERENCES facility_gates(gate_id) ON DELETE SET NULL,
      FOREIGN KEY (security_guard_id) REFERENCES auth_users(id) ON DELETE SET NULL
    );

    -- SECURITY DOMAIN
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

    SET FOREIGN_KEY_CHECKS = 1;
  `;
    try {
        const statements = schema.split(';').filter((stmt) => stmt.trim() !== '');
        for (const stmt of statements) {
            await pool.query(stmt);
        }
        console.log('Enterprise Database initialized successfully');
    }
    catch (error) {
        console.error('Error initializing database', error);
    }
};
export default pool;
