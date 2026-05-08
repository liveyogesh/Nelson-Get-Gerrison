import pool from './server/db.js';
async function update() {
    try {
        await pool.query('ALTER TABLE auth_users ADD COLUMN two_factor_secret VARCHAR(100) DEFAULT NULL');
        await pool.query('ALTER TABLE auth_users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE');
        console.log("Added 2fa columns");
    } catch(e) { console.log(e.message); }
    process.exit();
}
update();
