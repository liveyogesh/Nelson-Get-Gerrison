import db from './server/db.js';

async function migrate() {
  const queries = [
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS is_manually_escalated BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS escalation_reason TEXT;",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS escalation_target_role VARCHAR(50);",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS escalation_timestamp DATETIME;",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS qr_generated_at DATETIME;",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS secret_pass_code VARCHAR(100);",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS qr_token VARCHAR(255);",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS cancelled_by INT UNSIGNED;",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS cancelled_at DATETIME;",
    "ALTER TABLE gatepass_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;",
    "ALTER TABLE gatepass_requests DROP FOREIGN KEY IF EXISTS fk_cancelled_by;",
    "ALTER TABLE gatepass_requests ADD CONSTRAINT fk_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES auth_users(id) ON DELETE SET NULL;"
  ];

  for (const q of queries) {
    try {
      if (q.includes('DROP FOREIGN KEY')) {
         // handle drop constraints carefully, mysql syntax
         // ALTER TABLE gatepass_requests DROP FOREIGN KEY fk_cancelled_by;
         try { await db.query('ALTER TABLE gatepass_requests DROP FOREIGN KEY fk_cancelled_by;'); } catch (e) {}
      } else if (q.includes('IF NOT EXISTS') && q.startsWith('ALTER TABLE')) {
         // MySql might not support IF NOT EXISTS in ALTER TABLE for all versions
         const type = q.split(' ')[5];
         const tableName = q.split(' ')[2];
         const columnPart = q.split(' ADD COLUMN IF NOT EXISTS ')[1];
         const columnName = columnPart.split(' ')[0];
         try {
             await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnPart}`);
         } catch(e: any) {
             if (e.code === 'ER_DUP_FIELDNAME') {
                 console.log(`Column ${columnName} already exists`);
             } else {
                 console.error(e.message);
                 throw e;
             }
         }
      } else {
        await db.query(q);
      }
      console.log(`Executed: ${q}`);
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEY') {
        console.error(`Error executing ${q}`, err.message);
      }
    }
  }
}
migrate().then(() => process.exit(0)).catch(()=>process.exit(1));
