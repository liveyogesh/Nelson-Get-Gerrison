import mysql from 'mysql2/promise';
import { runEnterpriseHRMigration } from './enterprise_hr_migration.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '103.191.209.155',
    user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
    password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
    database: process.env.DB_NAME || 'dexly_nlsngrisn_db'
  });

  try {
    console.log("Connected to database. Starting MIGRATION.");
    await runEnterpriseHRMigration(connection);
    console.log("MIGRATION COMPLETE.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

main();
