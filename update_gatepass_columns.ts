import db from './server/db.js';

async function migrate() {
  try {
    console.log('Running migration...');
    const connection = await db.getConnection();
    
    // Add columns to gatepass_violations
    try {
      await connection.query('ALTER TABLE gatepass_violations ADD COLUMN employee_id INT');
      console.log('Added employee_id column.');
    } catch (e: any) {}
    try {
      await connection.query('ALTER TABLE gatepass_violations ADD COLUMN expected_return_time DATETIME');
      console.log('Added expected_return_time column.');
    } catch (e: any) {}
    try {
      await connection.query('ALTER TABLE gatepass_violations ADD COLUMN actual_return_time DATETIME');
      console.log('Added actual_return_time column.');
    } catch (e: any) {}
    try {
      await connection.query('ALTER TABLE gatepass_violations ADD COLUMN grace_period_used INT');
      console.log('Added grace_period_used column.');
    } catch (e: any) {}
    try {
      await connection.query('ALTER TABLE gatepass_movements ADD COLUMN grace_period_applied BOOLEAN DEFAULT FALSE');
      console.log('Added grace_period_applied column.');
    } catch (e: any) {}

    connection.release();
    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
