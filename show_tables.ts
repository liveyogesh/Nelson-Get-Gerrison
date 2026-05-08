import pool from './server/db.js';

async function main() {
    const [rows] = await pool.query('SHOW TABLES');
    console.log(JSON.stringify(rows, null, 2));
    process.exit();
}
main();
