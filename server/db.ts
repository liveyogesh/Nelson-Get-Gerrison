import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const initDB = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Initializing Enhanced Enterprise RBAC Database...');

    // Users Table Enhancement
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'STAFF',
        user_scope VARCHAR(50) DEFAULT 'STAFF', /* CORPORATE, FACILITY, DEPARTMENT, STAFF */
        scope_id INT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE', /* ACTIVE, INACTIVE, SUSPENDED, TERMINATED */
        first_login_completed BOOLEAN DEFAULT FALSE,
        password_changed_at DATETIME NULL,
        failed_attempts INT DEFAULT 0,
        locked_until DATETIME NULL,
        shift_start TIME NULL,
        shift_end TIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    // Audit Logging
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(50),
        resource_id VARCHAR(100),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        INDEX(action)
      ) ENGINE=InnoDB
    `);

    // Organization & Facilities
    await connection.query(`
      CREATE TABLE IF NOT EXISTS org_facilities (
        facility_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_name VARCHAR(100) NOT NULL,
        facility_code VARCHAR(20) UNIQUE NOT NULL,
        parent_facility_id INT UNSIGNED NULL,
        facility_category VARCHAR(50) DEFAULT 'HOSPITAL', /* HOSPITAL, CLINIC, CORPORATE, DIAGNOSTIC */
        regional_group VARCHAR(50),
        operational_timezone VARCHAR(50) DEFAULT 'UTC',
        is_corporate_managed BOOLEAN DEFAULT FALSE,
        location TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_facility_access (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        facility_id INT UNSIGNED NOT NULL,
        access_level VARCHAR(20) DEFAULT 'STANDARD', /* STANDARD, ADMIN */
        INDEX(user_id),
        INDEX(facility_id),
        FOREIGN KEY (user_id) REFERENCES auth_users(id),
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    // Shift Management
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shift_master (
        shift_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shift_name VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_night_shift BOOLEAN DEFAULT FALSE
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_shift_assignments (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        shift_id INT UNSIGNED NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        INDEX(user_id),
        FOREIGN KEY (user_id) REFERENCES auth_users(id),
        FOREIGN KEY (shift_id) REFERENCES shift_master(shift_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS shift_overrides (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        supervisor_id INT UNSIGNED NOT NULL,
        reason TEXT NOT NULL,
        extended_until DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        FOREIGN KEY (user_id) REFERENCES auth_users(id),
        FOREIGN KEY (supervisor_id) REFERENCES auth_users(id)
      ) ENGINE=InnoDB
    `);

    // Sessions & Security
    await connection.query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        device_fingerprint TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        FOREIGN KEY (user_id) REFERENCES auth_users(id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        username VARCHAR(50),
        status VARCHAR(20), /* SUCCESS, FAILED, LOCKED */
        ip_address VARCHAR(45),
        user_agent TEXT,
        attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        INDEX(attempt_time)
      ) ENGINE=InnoDB
    `);

    // System Settings for IP Restrictions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT
      )
    `);

    await connection.query(`
      INSERT IGNORE INTO system_settings (setting_key, setting_value, description) 
      VALUES ('Authorized_Gate_IPs', '127.0.0.1,::1', 'Authorized IPs for Security Scan Terminals')
    `);

    // Roles and Permissions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL,
        role_code VARCHAR(50) UNIQUE NOT NULL
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        permission_key VARCHAR(100) UNIQUE NOT NULL,
        module_name VARCHAR(100),
        description TEXT
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_role_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES auth_roles(id),
        FOREIGN KEY (permission_id) REFERENCES auth_permissions(id)
      ) ENGINE=InnoDB
    `);

    // Dynamic Assignments Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS department_role_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_role VARCHAR(50), /* HOD, Acting HOD, Supervisor, Coordinator */
        effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        effective_to DATETIME NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE'
      )
    `);

    // Delegated Authority (Temporal Inheritance)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS delegated_authority (
        delegation_id INT AUTO_INCREMENT PRIMARY KEY,
        delegated_from_user_id INT NOT NULL,
        delegated_to_user_id INT NOT NULL,
        role_id INT NOT NULL,
        effective_from DATETIME NOT NULL,
        effective_to DATETIME NOT NULL
      )
    `);

    // HR Modules
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hr_departments (
        department_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        department_name VARCHAR(100) NOT NULL,
        department_code VARCHAR(20) UNIQUE NOT NULL,
        facility_id INT UNSIGNED NOT NULL,
        INDEX(facility_id),
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS hr_employees (
        employee_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        department_id INT UNSIGNED,
        designation VARCHAR(100),
        monthly_quota INT DEFAULT 3,
        FOREIGN KEY (department_id) REFERENCES hr_departments(department_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS hr_employee_user_mapping (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        employee_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        UNIQUE(employee_id),
        UNIQUE(user_id),
        INDEX(employee_id),
        INDEX(user_id),
        FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id),
        FOREIGN KEY (user_id) REFERENCES auth_users(id)
      ) ENGINE=InnoDB
    `);

    // Gatepass Module
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gatepass_requests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        employee_id INT UNSIGNED NOT NULL,
        request_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        reason TEXT,
        is_priority BOOLEAN DEFAULT FALSE,
        facility_id INT,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(employee_id),
        FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS gatepass_approvals (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        request_id INT UNSIGNED NOT NULL,
        approver_id INT UNSIGNED NOT NULL,
        status VARCHAR(20) NOT NULL,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(request_id),
        INDEX(approver_id),
        FOREIGN KEY (request_id) REFERENCES gatepass_requests(id),
        FOREIGN KEY (approver_id) REFERENCES auth_users(id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_notifications (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20),
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES auth_users(id)
      ) ENGINE=InnoDB
    `);

    // Restricted Zones & Access
    await connection.query(`
      CREATE TABLE IF NOT EXISTS restricted_zones (
        zone_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        zone_name VARCHAR(100) NOT NULL,
        risk_level VARCHAR(20) DEFAULT 'HIGH', /* LOW, MEDIUM, HIGH, CRITICAL */
        facility_id INT UNSIGNED NOT NULL,
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS restricted_zone_access_requests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        zone_id INT UNSIGNED NOT NULL,
        hod_approval BOOLEAN DEFAULT FALSE,
        sechod_approval BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'PENDING', /* PENDING, APPROVED, REJECTED */
        reason TEXT,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        FOREIGN KEY (user_id) REFERENCES auth_users(id),
        FOREIGN KEY (zone_id) REFERENCES restricted_zones(zone_id)
      ) ENGINE=InnoDB
    `);

    // Security Incidents
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_incidents (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NOT NULL,
        incident_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL, /* LOW, MEDIUM, HIGH */
        involved_person VARCHAR(100),
        description TEXT,
        resolution_notes TEXT,
        status VARCHAR(20) DEFAULT 'OPEN', /* OPEN, INVESTIGATING, CLOSED */
        reported_by INT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(facility_id),
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id),
        FOREIGN KEY (reported_by) REFERENCES auth_users(id)
      ) ENGINE=InnoDB
    `);

    // Workflow Matrix Enhancement
    await connection.query(`
      CREATE TABLE IF NOT EXISTS workflow_approval_matrix (
        matrix_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NULL, /* NULL for Global Corporate Policy */
        department_id INT UNSIGNED NULL,
        workflow_type VARCHAR(50) NOT NULL, /* GATEPASS, RESTRICTED_ZONE, EMERGENCY_PASS */
        required_role_code VARCHAR(50) NOT NULL,
        approval_order INT DEFAULT 1,
        UNIQUE(facility_id, department_id, workflow_type, required_role_code)
      ) ENGINE=InnoDB
    `);

    // Facility Security Policies
    await connection.query(`
      CREATE TABLE IF NOT EXISTS facility_security_policies (
        policy_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NOT NULL,
        policy_key VARCHAR(100) NOT NULL, /* AUTHORIZED_IPS, GATE_TIMING_RESTR, QR_EXPIRY_SEC */
        policy_value TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(facility_id, policy_key),
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    // Gates & Traffic
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gate_master (
        gate_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        gate_name VARCHAR(50) NOT NULL,
        gate_type VARCHAR(20) DEFAULT 'STAFF', /* STAFF, PATIENT, AMBULANCE, SERVICE */
        facility_id INT UNSIGNED NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE', /* ACTIVE, LOCKDOWN, MAINTENANCE */
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS gate_traffic (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        gate_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NULL,
        movement_type VARCHAR(10) NOT NULL, /* IN, OUT */
        pass_id INT UNSIGNED NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(gate_id),
        INDEX(timestamp),
        FOREIGN KEY (gate_id) REFERENCES gate_master(gate_id)
      ) ENGINE=InnoDB
    `);

    // Multi-Facility Device Management
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_devices (
        device_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NOT NULL,
        gate_id INT UNSIGNED NULL,
        device_name VARCHAR(100) NOT NULL,
        device_type VARCHAR(50), /* SCANNER, TERMINAL, KIOSK */
        device_uuid VARCHAR(100) UNIQUE NOT NULL,
        trusted_network_ip VARCHAR(45),
        status VARCHAR(20) DEFAULT 'ONLINE', /* ONLINE, OFFLINE, MAINTENANCE, DISABLED */
        last_heartbeat DATETIME NULL,
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id),
        FOREIGN KEY (gate_id) REFERENCES gate_master(gate_id)
      ) ENGINE=InnoDB
    `);

    // --- RESTORING MISSING 13 TABLES (TOTAL 42) ---

    // 30. Visitor Management
    await connection.query(`
      CREATE TABLE IF NOT EXISTS visitor_master (
        visitor_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        id_proof_type VARCHAR(50),
        id_proof_number VARCHAR(50),
        organization VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS visitor_appointments (
        appointment_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        visitor_id INT UNSIGNED NOT NULL,
        host_user_id INT UNSIGNED NOT NULL,
        purpose TEXT,
        scheduled_arrival DATETIME NOT NULL,
        status VARCHAR(20) DEFAULT 'SCHEDULED', /* SCHEDULED, COMPLETED, CANCELLED */
        FOREIGN KEY (visitor_id) REFERENCES visitor_master(visitor_id),
        FOREIGN KEY (host_user_id) REFERENCES auth_users(id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS visitor_logs (
        log_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        visitor_id INT UNSIGNED NOT NULL,
        gate_id INT UNSIGNED NOT NULL,
        entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        exit_time DATETIME NULL,
        host_user_id INT UNSIGNED,
        status VARCHAR(20) DEFAULT 'IN',
        FOREIGN KEY (visitor_id) REFERENCES visitor_master(visitor_id),
        FOREIGN KEY (gate_id) REFERENCES gate_master(gate_id)
      ) ENGINE=InnoDB
    `);

    // 33. Asset Management
    await connection.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL,
        is_restricted BOOLEAN DEFAULT FALSE
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS asset_master (
        asset_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asset_name VARCHAR(100) NOT NULL,
        asset_code VARCHAR(50) UNIQUE NOT NULL,
        category_id INT UNSIGNED,
        owner_user_id INT UNSIGNED,
        facility_id INT UNSIGNED NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        FOREIGN KEY (category_id) REFERENCES asset_categories(category_id),
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS asset_movements (
        movement_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asset_id INT UNSIGNED NOT NULL,
        gate_id INT UNSIGNED NOT NULL,
        movement_type VARCHAR(10) NOT NULL, /* IN, OUT */
        authorized_by INT UNSIGNED NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES asset_master(asset_id),
        FOREIGN KEY (gate_id) REFERENCES gate_master(gate_id)
      ) ENGINE=InnoDB
    `);

    // 36. Vehicle Management
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicle_master (
        vehicle_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        license_plate VARCHAR(20) UNIQUE NOT NULL,
        vehicle_type VARCHAR(50), /* PERSONAL, COMPANY, AMBULANCE, SERVICE */
        owner_user_id INT UNSIGNED NULL,
        facility_id INT UNSIGNED NOT NULL,
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicle_logs (
        log_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT UNSIGNED NOT NULL,
        gate_id INT UNSIGNED NOT NULL,
        movement_type VARCHAR(10) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicle_master(vehicle_id),
        FOREIGN KEY (gate_id) REFERENCES gate_master(gate_id)
      ) ENGINE=InnoDB
    `);

    // 38. Contractor Management
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contractor_master (
        contractor_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        firm_name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        contact_number VARCHAR(20),
        status VARCHAR(20) DEFAULT 'ACTIVE'
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS contractor_attendance (
        attendance_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        contractor_id INT UNSIGNED NOT NULL,
        worker_count INT NOT NULL,
        facility_id INT UNSIGNED NOT NULL,
        report_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contractor_id) REFERENCES contractor_master(contractor_id),
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    // 40. Emergency & Policy
    await connection.query(`
      CREATE TABLE IF NOT EXISTS emergency_incidents (
        emergency_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NOT NULL,
        emergency_type VARCHAR(50) NOT NULL, /* FIRE, MEDICAL, SECURITY, DISASTER */
        severity_score INT DEFAULT 10,
        is_active BOOLEAN DEFAULT TRUE,
        activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME NULL,
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS policy_documents (
        policy_doc_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NOT NULL,
        policy_name VARCHAR(100) NOT NULL,
        version VARCHAR(10) DEFAULT '1.0',
        content_summary TEXT,
        is_current BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS compliance_checklists (
        checklist_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NOT NULL,
        checklist_name VARCHAR(100) NOT NULL,
        frequency VARCHAR(20) DEFAULT 'DAILY', /* DAILY, WEEKLY, MONTHLY */
        last_checked DATETIME NULL,
        FOREIGN KEY (facility_id) REFERENCES org_facilities(facility_id)
      ) ENGINE=InnoDB
    `);

    console.log('Database Initialization Complete.');
  } finally {
    connection.release();
  }
};

export default pool;
