import pool from './server/db.js';
async function update() {
    try {
        await pool.query('ALTER TABLE security_incidents ADD COLUMN involved_person_id INT UNSIGNED DEFAULT NULL');
        console.log("Added involved_person_id");
    } catch(e) { console.log("involved_person_id exists", e.message); }

    try {
        await pool.query('ALTER TABLE security_incidents ADD COLUMN location VARCHAR(200) DEFAULT NULL');
        console.log("Added location");
    } catch(e) { console.log("location exists", e.message); }

    try {
        await pool.query('ALTER TABLE security_incidents ADD COLUMN incident_status VARCHAR(20) DEFAULT "OPEN"'); 
        console.log("Added incident_status");
    } catch(e) { console.log("incident_status exists", e.message); }

    process.exit();
}
update();
