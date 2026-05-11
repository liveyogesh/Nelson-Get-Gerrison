import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("Applying table alterations for secret code...");

    const addCols = [
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN secret_pass_code VARCHAR(20) UNIQUE' },
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN qr_token TEXT' },
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN qr_generated_at DATETIME' },
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN qr_expiry_at DATETIME' },
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN manual_override_used BOOLEAN DEFAULT FALSE' },
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN override_reason VARCHAR(255)' },
      
      { table: 'gatepass_movements', query: 'ALTER TABLE gatepass_movements ADD COLUMN verification_mode VARCHAR(50) DEFAULT "QR_SCAN"' },
      { table: 'gatepass_movements', query: 'ALTER TABLE gatepass_movements ADD COLUMN verified_by_user_id INT' },
      { table: 'gatepass_movements', query: 'ALTER TABLE gatepass_movements ADD COLUMN verification_device_id VARCHAR(255)' },
    ];

    for (const { table, query } of addCols) {
      try {
        await pool.query(query);
        console.log("Executed: " + query);
      } catch (e: any) {
        if (!e.message.includes('Duplicate column')) console.log("Skipping/Error:", e.message);
      }
    }
    
    // Create code_verification_attempts table
    const createLockTable = "CREATE TABLE IF NOT EXISTS code_verification_attempts (attempt_id INT AUTO_INCREMENT PRIMARY KEY, ip_address VARCHAR(100), user_id INT, secret_code_attempt VARCHAR(50), attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_successful BOOLEAN DEFAULT FALSE, FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE);";
    await pool.query(createLockTable);
    console.log("Created code_verification_attempts");

    console.log("Alterations complete.");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
