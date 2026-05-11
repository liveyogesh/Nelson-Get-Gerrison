import db, { initDB } from './server/db.js';

async function run() {
  try {
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    const [rows]: any = await db.query("SHOW TABLES");
    for (const row of rows) {
      const table = Object.values(row)[0];
      console.log(`Dropping ${table}...`);
      await db.query(`DROP TABLE IF EXISTS ${table}`);
    }
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    // Run the db init script
    console.log("Running initDB...");
    await initDB();
    console.log("Done.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
