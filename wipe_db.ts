import pool from './server/db.js';

async function main() {
    console.log("DROPING ALL TABLES FOR FRESH START...");
    const conn = await pool.getConnection();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const [rows]: any = await pool.query('SHOW TABLES');
    const dbName = 'dexly_nlsngrisn_db';
    const key = `Tables_in_${dbName}`;
    
    for (const row of rows) {
        const table = row[key];
        await conn.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`Dropped ${table}`);
    }
    
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    conn.release();
    console.log("DATABASE WIPED.");
    process.exit();
}
main();
