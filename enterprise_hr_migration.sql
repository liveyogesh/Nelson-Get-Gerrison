-- Enterprise HR Database Architecture
-- This script contains all the SQL schemas needed to enhance the existing structure safely.

START TRANSACTION;

-- ==========================================
-- 1. MASTER TABLES GOVERNANCE
-- ==========================================

CREATE TABLE IF NOT EXISTS employee_category_master (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS employment_type_master (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS employment_status_master (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 2. MAPPING ENGINE (DEPARTMENTS & DESIGNATIONS)
-- ==========================================

CREATE TABLE IF NOT EXISTS hr_departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(255) NOT NULL,
    parent_department_id INT NULL,
    facility_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_department_id) REFERENCES hr_departments(department_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS department_mapping_rules (
    rule_id INT AUTO_INCREMENT PRIMARY KEY,
    raw_hims_string VARCHAR(255) UNIQUE NOT NULL,
    mapped_department_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mapped_department_id) REFERENCES hr_departments(department_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hr_designations (
    designation_id INT AUTO_INCREMENT PRIMARY KEY,
    designation_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designation_mapping_rules (
    rule_id INT AUTO_INCREMENT PRIMARY KEY,
    raw_hims_string VARCHAR(255) UNIQUE NOT NULL,
    mapped_designation_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mapped_designation_id) REFERENCES hr_designations(designation_id) ON DELETE SET NULL
);

-- ==========================================
-- 3. ENHANCE HR_EMPLOYEES (BASE IDENTITY)
-- ==========================================

-- We safely alter the existing hr_employees table.
-- Existing required fields: employee_id, employee_code, first_name, last_name, mobile, email, created_at

-- Adding Enterprise Identity fields
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employee_uuid VARCHAR(36) UNIQUE AFTER employee_id;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employee_code_normalized VARCHAR(100) UNIQUE AFTER employee_code;

-- Adding normal HR fields
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255) AFTER first_name;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS gender ENUM('MALE', 'FEMALE', 'OTHER', 'UNKNOWN') DEFAULT 'UNKNOWN';
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS DOB DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS alternate_mobile VARCHAR(50);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS official_email VARCHAR(255) UNIQUE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS biometric_code VARCHAR(150) UNIQUE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS relieving_date DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS active_status BOOLEAN DEFAULT TRUE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- Adding Category Foreign keys
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employee_category_id INT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employment_type_id INT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employment_status_id INT;

-- (Note: MySQL doesn't natively support ADD CONSTRAINT IF NOT EXISTS simply, so they might need checking manualy in raw SQL. We assume they don't break if run on fresh clone)

-- ==========================================
-- 4. EMPLOYEE POSTINGS & FACILITY GOVERNANCE
-- ==========================================

CREATE TABLE IF NOT EXISTS employee_postings (
    posting_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    facility_id INT NOT NULL,
    department_id INT NOT NULL,
    designation_id INT NOT NULL,
    reporting_manager_employee_id INT NULL,
    shift_id INT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    posting_status ENUM('ACTIVE', 'TRANSFER', 'DEPUTATION', 'COMPLETED') DEFAULT 'ACTIVE',
    primary_posting_flag BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE CASCADE,
    FOREIGN KEY (designation_id) REFERENCES hr_designations(designation_id) ON DELETE CASCADE,
    FOREIGN KEY (reporting_manager_employee_id) REFERENCES hr_employees(employee_id) ON DELETE SET NULL
);

-- Authentication separation mapping
CREATE TABLE IF NOT EXISTS hr_employee_user_mapping (
    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE
);

-- Facility Access
CREATE TABLE IF NOT EXISTS employee_facility_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    facility_id INT NOT NULL,
    access_level ENUM('PRIMARY', 'SECONDARY', 'GUEST', 'REVOKED') DEFAULT 'PRIMARY',
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. STAGING ARCHITECTURE (1. RAW, 2. CLEANED)
-- ==========================================

CREATE TABLE IF NOT EXISTS stg_hims_employee_import (
    raw_id INT AUTO_INCREMENT PRIMARY KEY,
    import_batch_id VARCHAR(100) NOT NULL,
    source_system VARCHAR(100) DEFAULT 'HIMS',
    raw_json_snapshot JSON NOT NULL,
    raw_employee_code VARCHAR(255),
    raw_employee_name VARCHAR(255),
    raw_gender VARCHAR(100),
    raw_dob VARCHAR(100),
    raw_doj VARCHAR(100),
    raw_designation VARCHAR(255),
    raw_department VARCHAR(255),
    raw_supervisor VARCHAR(255),
    raw_mobile VARCHAR(255),
    raw_email VARCHAR(255),
    raw_employment_status VARCHAR(100),
    raw_roster VARCHAR(255),
    import_status ENUM('PENDING', 'PROCESSED', 'FAILED') DEFAULT 'PENDING',
    import_errors TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stg_employee_cleaned (
    cleaned_id INT AUTO_INCREMENT PRIMARY KEY,
    raw_id INT NOT NULL,
    batch_id VARCHAR(100) NOT NULL,
    
    -- Cleaned Values
    employee_code_normalized VARCHAR(100),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    gender ENUM('MALE', 'FEMALE', 'OTHER', 'UNKNOWN') DEFAULT 'UNKNOWN',
    dob DATE NULL,
    doj DATE NULL,
    mobile_normalized VARCHAR(50),
    email_normalized VARCHAR(255),

    -- Mapped IDs
    mapped_department_id INT NULL,
    mapped_designation_id INT NULL,
    resolved_supervisor_id INT NULL,
    mapped_status_id INT NULL,
    
    -- Validation Flags
    is_duplicate BOOLEAN DEFAULT FALSE,
    invalid_mobile BOOLEAN DEFAULT FALSE,
    invalid_email BOOLEAN DEFAULT FALSE,
    invalid_dob BOOLEAN DEFAULT FALSE,
    unresolved_department BOOLEAN DEFAULT FALSE,
    unresolved_designation BOOLEAN DEFAULT FALSE,
    unresolved_supervisor BOOLEAN DEFAULT FALSE,

    sync_status ENUM('PENDING', 'SYNCED', 'ERROR') DEFAULT 'PENDING',
    sync_error_log TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (raw_id) REFERENCES stg_hims_employee_import(raw_id) ON DELETE CASCADE
);

-- ==========================================
-- 6. AUDIT HISTORY
-- ==========================================

CREATE TABLE IF NOT EXISTS employee_change_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    changed_by_user_id INT UNSIGNED NULL,
    change_type ENUM('CREATION', 'POSTING_CHANGE', 'STATUS_CHANGE', 'PROFILE_UPDATE', 'FACILITY_TRANSFER') NOT NULL,
    old_value_json JSON NULL,
    new_value_json JSON NOT NULL,
    reason TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE
);

-- ==========================================
-- 7. PERFORMANCE & INDEXING
-- ==========================================

CREATE INDEX idx_emp_code_norm ON hr_employees(employee_code_normalized);
CREATE INDEX idx_emp_off_email ON hr_employees(official_email);
CREATE INDEX idx_emp_mobile ON hr_employees(mobile);
CREATE INDEX idx_post_fac ON employee_postings(facility_id);
CREATE INDEX idx_post_dept ON employee_postings(department_id);
CREATE INDEX idx_post_mgr ON employee_postings(reporting_manager_employee_id);
CREATE INDEX idx_stg_batch ON stg_hims_employee_import(import_batch_id);

COMMIT;
