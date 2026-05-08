import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
});

async function run() {
  try {
    console.log("Applying production-ready schema migrations...");
    const conn = await pool.getConnection();

    const addColumn = async (table: string, col: string, definition: string) => {
        try {
            await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
            console.log(`Added column ${col} to ${table}`);
        } catch (e: any) {
            if (!e.message.includes('Duplicate column')) console.error(e.message);
        }
    };

    // auth_users
    await addColumn('auth_users', 'password', 'VARCHAR(255) NOT NULL AFTER email');
    await addColumn('auth_users', 'shift_start', 'TIME NULL AFTER scope_id');
    await addColumn('auth_users', 'shift_end', 'TIME NULL AFTER shift_start');

    // hr_employees
    await addColumn('hr_employees', 'monthly_quota', 'INT DEFAULT 3 AFTER designation');

    // gatepass_requests
    await addColumn('gatepass_requests', 'is_priority', 'BOOLEAN DEFAULT FALSE AFTER reason');

    conn.release();
    console.log("Migrations complete.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
