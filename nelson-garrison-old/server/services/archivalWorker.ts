import schedule from 'node-schedule';
import db from '../db.js';

export function startArchivalWorker() {
  // Run everyday at 2:00 AM
  schedule.scheduleJob('0 2 * * *', async () => {
    console.log('[ARCHIVAL WORKER] Starting nightly archival process...');
    try {
      await db.query('CALL sp_archive_old_data()');
      console.log('[ARCHIVAL WORKER] Archival completed successfully.');
    } catch (e) {
      console.error('[ARCHIVAL WORKER] Archival failed:', e);
    }
  });
  console.log('Archival worker service initialized.');
}
