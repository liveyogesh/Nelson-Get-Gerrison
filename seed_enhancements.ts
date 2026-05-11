import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("Applying table alterations...");

    const addCols = [
      { table: 'gatepass_movements', query: 'ALTER TABLE gatepass_movements ADD COLUMN late_return BOOLEAN DEFAULT FALSE' },
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN is_priority BOOLEAN DEFAULT FALSE' },
      { table: 'gatepass_requests', query: 'ALTER TABLE gatepass_requests ADD COLUMN priority_reason VARCHAR(255)' },
      { table: 'hr_departments', query: 'ALTER TABLE hr_departments ADD COLUMN parent_department_id INT' }
    ];

    for (const { table, query } of addCols) {
      try {
        await pool.query(query);
      } catch (e: any) {
        if (!e.message.includes('Duplicate column')) console.log(e.message);
      }
    }

    console.log("Alterations complete.");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
