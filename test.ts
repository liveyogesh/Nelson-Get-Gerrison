import db from './server/db.js';
async function run() {
  const [rows]: any = await db.query("SHOW TABLES");
  console.log(rows.map((r:any) => Object.values(r)[0]));
  console.log('Total Tables:', rows.length);
  process.exit(0);
}
run();

