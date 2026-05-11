import db from './server/db';
async function run() {
  try {
    const tables = ['gatepass_requests', 'auth_users'];
    for (const t of tables) {
      console.log(`\n--- ${t} ---`);
      const [rows] = await db.query(`DESCRIBE ${t}`);
      console.log(rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
