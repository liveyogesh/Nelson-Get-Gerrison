import { initDB } from './server/db.js';

async function main() {
  try {
    await initDB();
    console.log("DB Initialized.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

main();
