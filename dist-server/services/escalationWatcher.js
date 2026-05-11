import cron from 'node-cron';
import db from '../db.js';
import { logAudit } from '../middleware/auth.js';
export const startEscalationWatcher = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        try {
            console.log('[Escalation Watcher] Checking for pending gatepass requests > 15 mins...');
            const thresholdTime = new Date(Date.now() - 15 * 60 * 1000);
            const [pendingRequests] = await db.query(`SELECT request_id, employee_id, current_status, created_at
         FROM gatepass_requests
         WHERE current_status = 'PENDING' AND created_at < ?`, [thresholdTime]);
            if (pendingRequests.length === 0) {
                return;
            }
            console.log(`[Escalation Watcher] Found ${pendingRequests.length} requests to escalate.`);
            for (const req of pendingRequests) {
                // Auto-bypass HOD to HR
                await db.execute(`UPDATE gatepass_requests SET current_status = 'ESCALATED_TO_HR' WHERE request_id = ?`, [req.request_id]);
                // Optional: you could insert an approval log
                await db.execute(`INSERT INTO gatepass_approvals (request_id, approval_level, status, approver_id, remarks)
           VALUES (?, ?, ?, ?, ?)`, [req.request_id, 'HOD', 'AUTO_ESCALATED', null, 'System Auto-Escalation due to 15-minute timeout']);
                // Audit Log using logAudit (we pass dummy Request since it's a background worker)
                const mockReq = { ip: '127.0.0.1', headers: {} };
                await logAudit(null, 'AUTO_ESCALATION', 'GATEPASS', 'gatepass_requests', req.request_id, { current_status: 'PENDING' }, { current_status: 'ESCALATED_TO_HR', note: 'System Auto-Escalation' }, mockReq);
            }
        }
        catch (err) {
            console.error('[Escalation Watcher] Error:', err);
        }
    });
};
