import cron from 'node-cron';
import db from '../db.js';
import { logAudit } from '../middleware/auth.js';
import { Server } from 'socket.io';

export const startEscalationWatcher = (io: Server) => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[Escalation Watcher] Checking for pending gatepass requests > 15 mins...');
      
      let timeoutMins = 15;
      try {
        const [settings]: any = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'escalation_timeout_mins'");
        if (settings.length > 0 && settings[0].setting_value) {
            const parsed = parseInt(settings[0].setting_value, 10);
            if (!isNaN(parsed) && parsed > 0) timeoutMins = parsed;
        }
      } catch (e) { console.error("Could not fetch escalation_timeout_mins", e); }
      
      const thresholdTime = new Date(Date.now() - timeoutMins * 60 * 1000);
      
      const [pendingRequests]: any = await db.query(
        `SELECT request_id, employee_id, current_status, created_at
         FROM gatepass_requests
         WHERE current_status = 'PENDING' 
         AND is_priority = FALSE 
         AND created_at < ?`,
        [thresholdTime]
      );

      if (pendingRequests.length === 0) {
        return;
      }

      console.log(`[Escalation Watcher] Found ${pendingRequests.length} requests to escalate.`);

      for (const req of pendingRequests) {
        // Auto-bypass HOD to HR
        await db.execute(
          `UPDATE gatepass_requests SET current_status = 'ESCALATED_TO_HR' WHERE request_id = ?`,
          [req.request_id]
        );

        // Optional: you could insert an approval log
        await db.execute(
          `INSERT INTO gatepass_approvals (request_id, approval_level, approver_user_id, action, remarks)
           VALUES (?, ?, ?, ?, ?)`,
          [req.request_id, 1, null, 'SYSTEM_AUTO_ESCALATION', 'System Auto-Escalation due to 15-minute timeout']
        );

        // Emit socket event to notify HR and HOD
        io.emit('notification', {
          title: 'Gatepass Auto-Escalation',
          message: `Request #${req.request_id} has been automatically escalated to HR due to inactivity.`,
          type: 'warning',
          role: ['HR']
        });

        // Audit Log using logAudit (we pass dummy Request since it's a background worker)
        const mockReq = { ip: '127.0.0.1', headers: {} } as any;
        await logAudit(
          null, 
          'System_Bypass_Escalation', 
          'GATEPASS', 
          'gatepass_requests', 
          req.request_id, 
          { current_status: 'PENDING' }, 
          { current_status: 'ESCALATED_TO_HR', note: 'System Auto-Escalation' }, 
          mockReq
        );
      }

      // Visitor Pass Expiry Watcher
      let expiryWarningMins = 15;
      try {
        const [warnSettings]: any = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'visitor_expiry_warning_mins'");
        if (warnSettings.length > 0 && warnSettings[0].setting_value) {
            const parsed = parseInt(warnSettings[0].setting_value, 10);
            if (!isNaN(parsed) && parsed > 0) expiryWarningMins = parsed;
        }
      } catch (e) { console.error("Could not fetch visitor_expiry_warning_mins", e); }

      const [nearingExpiry]: any = await db.query(`
        SELECT v.*, vm.first_name, vm.last_name, vm.mobile, m.user_id as host_user_id
        FROM visitor_visits v
        JOIN visitor_master vm ON v.visitor_id = vm.visitor_id
        LEFT JOIN hr_employee_user_mapping m ON v.host_employee_id = m.employee_id
        WHERE v.status = 'CHECKED_IN'
        AND v.expected_exit_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? MINUTE)
      `, [expiryWarningMins]);

      for (const visit of nearingExpiry) {
        // Find if we already notified recently to prevent spam (we can just emit it, frontend notification limits apply)
        io.emit('notification', {
          title: 'Visitor Pass Expiring',
          message: `Pass for ${visit.first_name} ${visit.last_name} (#${visit.pass_number}) expires in ${expiryWarningMins} minutes.`,
          type: 'warning',
          role: ['SECURITY_GUARD', 'SUPER_ADMIN'], // notify security
          userId: visit.host_user_id // targeted notification to host
        });
      }

      // Staff Gatepass Expiry Watcher
      // 1. Nearing Requested Exit Time (within 15 mins)
      const [nearingExit]: any = await db.query(`
        SELECT g.*, e.first_name, e.last_name, m.user_id
        FROM gatepass_requests g
        JOIN hr_employees e ON g.employee_id = e.employee_id
        JOIN hr_employee_user_mapping m ON e.employee_id = m.employee_id
        WHERE g.current_status = 'APPROVED'
        AND g.requested_exit_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 15 MINUTE)
      `);

      for (const req of nearingExit) {
        io.emit('notification', {
          title: 'Gatepass Departure Reminder',
          message: `Your requested exit time for GP-${req.request_id} is in 15 minutes.`,
          type: 'info',
          userId: req.user_id
        });
      }

      // 2. Nearing Expected Return Time (within 15 mins)
      const [nearingReturn]: any = await db.query(`
        SELECT g.*, e.first_name, e.last_name, m.user_id
        FROM gatepass_requests g
        JOIN hr_employees e ON g.employee_id = e.employee_id
        JOIN hr_employee_user_mapping m ON e.employee_id = m.employee_id
        WHERE g.current_status = 'OUT'
        AND g.expected_return_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 15 MINUTE)
      `);

      for (const req of nearingReturn) {
        io.emit('notification', {
          title: 'Gatepass Return Warning',
          message: `Your expected return time for GP-${req.request_id} is in 15 minutes. Please ensure timely return.`,
          type: 'warning',
          userId: req.user_id
        });
      }
    } catch (err) {
      console.error('[Escalation Watcher] Error:', err);
    }
  });
};
