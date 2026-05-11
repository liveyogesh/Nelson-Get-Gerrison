import db from './db';

const migrate = async () => {
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS organization_master (
                organization_id INT AUTO_INCREMENT PRIMARY KEY,
                organization_code VARCHAR(100) UNIQUE NOT NULL,
                organization_name VARCHAR(255) NOT NULL,
                address TEXT,
                active_status BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS state_master (
                state_id INT AUTO_INCREMENT PRIMARY KEY,
                state_code VARCHAR(50) NOT NULL UNIQUE,
                state_name VARCHAR(100) NOT NULL,
                country_code VARCHAR(50),
                active_status BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS location_master (
                location_id INT AUTO_INCREMENT PRIMARY KEY,
                state_id INT,
                city_name VARCHAR(100) NOT NULL,
                district_name VARCHAR(100),
                pincode VARCHAR(20),
                active_status BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (state_id) REFERENCES state_master(state_id) ON DELETE SET NULL
            );`,
            `CREATE TABLE IF NOT EXISTS facility_master (
                facility_id INT AUTO_INCREMENT PRIMARY KEY,
                organization_id INT,
                location_id INT,
                facility_code VARCHAR(100) UNIQUE NOT NULL,
                facility_name VARCHAR(255) NOT NULL,
                facility_type VARCHAR(100),
                address TEXT,
                active_status BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organization_master(organization_id) ON DELETE SET NULL,
                FOREIGN KEY (location_id) REFERENCES location_master(location_id) ON DELETE SET NULL
            );`,
            `CREATE TABLE IF NOT EXISTS pass_type_master (
                pass_type_id INT AUTO_INCREMENT PRIMARY KEY,
                pass_type_code VARCHAR(100) UNIQUE NOT NULL,
                pass_type_name VARCHAR(255) NOT NULL,
                description TEXT,
                active_status BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS employee_type_master (
                employee_type_id INT AUTO_INCREMENT PRIMARY KEY,
                type_code VARCHAR(100) UNIQUE NOT NULL,
                type_name VARCHAR(255) NOT NULL,
                description TEXT,
                active_status BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS designation_master (
                designation_id INT AUTO_INCREMENT PRIMARY KEY,
                designation_code VARCHAR(100) UNIQUE NOT NULL,
                designation_name VARCHAR(255) NOT NULL,
                department_id INT,
                parent_designation_id INT,
                active_status BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES hr_departments(department_id) ON DELETE SET NULL,
                FOREIGN KEY (parent_designation_id) REFERENCES designation_master(designation_id) ON DELETE SET NULL
            );`,
            `CREATE TABLE IF NOT EXISTS employee_change_history (
                history_id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                change_type VARCHAR(100) NOT NULL,
                old_value TEXT,
                new_value TEXT,
                changed_by INT UNSIGNED,
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                reason TEXT,
                FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES auth_users(id) ON DELETE SET NULL
            );`
        ];

        for (const query of queries) {
            try {
                await db.query(query);
            } catch (e: any) {
                console.error("Query failed: ", query.substring(0, 50) + "...", e.message);
            }
        }
        
        // Add normalize code and status validation fields if they don't exist
        const alterQueries = [
            "ALTER TABLE hr_employees ADD COLUMN employee_code_normalized VARCHAR(100) UNIQUE;",
            "ALTER TABLE hr_employees ADD COLUMN employee_type_id INT;",
            "ALTER TABLE active_sessions ADD COLUMN last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE active_sessions ADD COLUMN forced_logout_flag BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE active_sessions ADD COLUMN revoked_by INT UNSIGNED;",
            "ALTER TABLE active_sessions ADD COLUMN revoked_at DATETIME;",
            "ALTER TABLE active_sessions ADD CONSTRAINT fk_revoked_by FOREIGN KEY (revoked_by) REFERENCES auth_users(id) ON DELETE SET NULL;"
        ];
        
        for (const query of alterQueries) {
            try {
                await db.query(query);
            } catch (e: any) {
                // Ignore duplicate column errors
            }
        }
        
        console.log("Migration 2 completed");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

migrate();
