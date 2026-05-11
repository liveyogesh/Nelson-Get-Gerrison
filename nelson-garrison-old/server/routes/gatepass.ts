import { Router } from 'express';
import db from '../db.js';
import { io } from '../index.js';
import { logAudit, authenticateToken, authorizePermissions, scopeFacility, checkActiveShift } from '../middleware/auth.js';
import QRCode from 'qrcode';

import jwt from 'jsonwebtoken';

function generateSecretCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NLG-${code}`;
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nelson_garrison_secret_key_2024';

// Apply auth middleware to all these routes
router.use(authenticateToken);
router.use(scopeFacility);
router.use(checkActiveShift);

router.post('/', authorizePermissions('MANAGE_OWN_GATEPASS'), async (req: any, res: any) => {
  try {
    const { employeeId, type, reason, emergencyFlag, isPriority, priorityReason, facilityId, requestedExitTime, expectedReturnTime } = req.body;
    const userId = req.user?.id || 1;
    const empId = employeeId || 1;

    // Check Priority reason
    if (isPriority && (!priorityReason || priorityReason.trim() === '')) {
      return res.status(400).json({ error: 'Priority requests require a valid reason.' });
    }

    // Check limit for PERSONAL pass (limit = 3/month)
    if (type === 'PERSONAL') {
      const [countCheck]: any = await db.query(
        `SELECT COUNT(*) as count FROM gatepass_requests 
         WHERE employee_id = ? AND request_type = 'PERSONAL' 
         AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
         AND YEAR(created_at) = YEAR(CURRENT_DATE())
         AND current_status NOT IN ('REJECTED', 'VOID')`,
        [empId]
      );
      if (countCheck[0].count >= 3) {
        return res.status(400).json({ error: 'Personal pass limit of 3 per month has been reached.' });
      }
    }

    const [result]: any = await db.execute(
      `INSERT INTO gatepass_requests 
        (request_type, employee_id, reason, current_status, emergency_flag, is_priority, priority_reason, facility_id, requested_exit_time, expected_return_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, empId, reason, 'PENDING', emergencyFlag || false, isPriority || false, priorityReason || null, facilityId || 1, requestedExitTime || null, expectedReturnTime || null]
    );

    const newPassId = result.insertId;
    
    // Generate JWT for QR
    const tokenPayload = { request_id: newPassId, employee_id: empId, type, iat: Math.floor(Date.now() / 1000) };
    const qrText = jwt.sign(tokenPayload, JWT_SECRET);
    const qrDataUrl = await QRCode.toDataURL(qrText);
    
    // Generate secure pass code
    let secretCode = '';
    let success = false;
    while (!success) {
      try {
        secretCode = generateSecretCode();
        await db.execute('UPDATE gatepass_requests SET qr_code_data = ?, secret_pass_code = ?, qr_token = ?, qr_generated_at = NOW() WHERE request_id = ?', [qrDataUrl, secretCode, qrText, newPassId]);
        success = true;
      } catch (e: any) {
        if (!e.message.includes('Duplicate entry')) {
          throw e; // throw if it's not a duplicate entry error
        }
      }
    }

    // Audit Log
    await logAudit(userId, 'GATEPASS_CREATE', 'GATEPASS_SERVICE', 'gatepass_requests', newPassId, null, { type, reason, isPriority }, req);

    if (isPriority) {
      // Find HOD for employee's department
      const [hodMappings]: any = await db.query(
        `SELECT m.user_id FROM department_role_assignments dra
         JOIN hr_employees e ON dra.department_id = e.department_id
         JOIN hr_employee_user_mapping m ON dra.employee_id = m.employee_id
         WHERE e.employee_id = ? AND dra.assignment_role = 'HOD' AND dra.active_status = TRUE`,
        [empId]
      );

      // Find HR Managers
      const [hrUsers]: any = await db.query(
        `SELECT ur.user_id FROM auth_user_roles ur
         JOIN auth_roles r ON ur.role_id = r.id
         WHERE r.role_code = 'HR'`
      );

      const targetUsers = [
         ...hodMappings.map((h: any) => h.user_id),
         ...hrUsers.map((h: any) => h.user_id)
      ];

      const deduplicatedUsers = [...new Set(targetUsers)];
      
      for (const tUser of deduplicatedUsers) {
         const [notifResult]: any = await db.execute(
           'INSERT INTO system_notifications (recipient_user_id, notification_type, message) VALUES (?, ?, ?)',
           [tUser, 'PRIORITY_GATEPASS', `High priority request #${newPassId} created. Reason: ${priorityReason}`]
         );
         await db.execute(
           'INSERT INTO notification_queue (notification_id, recipient_user_id, channel) VALUES (?, ?, ?)',
           [notifResult.insertId, tUser, 'IN_APP']
         );
      }
    }

    res.json({ success: true, id: newPassId, qr: qrDataUrl, secret_pass_code: secretCode });
  } catch (err: any) {
    console.error('Failed to create gatepass:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/scan-entry', async (req: any, res: any) => {
  try {
    const { qr } = req.body;
    if (!qr) return res.status(400).json({ error: 'QR token required' });
    
    // Validate JWT
    let decoded: any;
    try {
      decoded = jwt.verify(qr as string, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or forged QR token' });
    }
    
    const requestId = decoded.request_id;
    const userId = req.user?.id || 1;

    const [requestData]: any = await db.query(
      'SELECT current_status, expected_return_time FROM gatepass_requests WHERE request_id = ?',
      [requestId]
    );

    if (!requestData || requestData.length === 0) {
      return res.status(404).json({ error: 'Gatepass not found' });
    }

    const { current_status, expected_return_time } = requestData[0];
    const now = new Date();
    const expectedReturn = expected_return_time ? new Date(expected_return_time) : null;

    if (current_status !== 'OUT') {
      return res.status(400).json({ error: 'Cannot Check-In. Pass is not checked OUT.' });
    }

    let late_return = false;
    if (expectedReturn) {
        let graceMins = 0;
        try {
          const [settings]: any = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'grace_period_mins'");
          if (settings.length > 0 && settings[0].setting_value) graceMins = parseInt(settings[0].setting_value, 10) || 0;
        } catch (e) {}
        
        const threshold = new Date(expectedReturn.getTime() + graceMins * 60 * 1000);
        if (now > threshold) late_return = true;
    }

    await db.execute(
      'UPDATE gatepass_movements SET entry_time = NOW(), late_return = ?, verification_mode = ?, verified_by_user_id = ? WHERE request_id = ? AND entry_time IS NULL ORDER BY movement_id DESC LIMIT 1',
      [late_return, 'QR_SCAN', userId, requestId]
    );

    if (late_return) {
        const [lastMovement]: any = await db.query('SELECT movement_id FROM gatepass_movements WHERE request_id = ? ORDER BY movement_id DESC LIMIT 1', [requestId]);
        if(lastMovement && lastMovement.length > 0) {
          await db.execute(
            'INSERT INTO gatepass_violations (request_id, movement_id, violation_type, severity, description) VALUES (?, ?, ?, ?, ?)',
            [requestId, lastMovement[0].movement_id, 'LATE_RETURN', 'MEDIUM', 'Employee returned after expected time.']
          );
        }
    }

    await db.execute('UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?', ['RETURNED', requestId]);
    await logAudit(userId, 'GATEPASS_MOVEMENT', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, { current_status }, { current_status: 'RETURNED', movementType: 'ENTRY', late_return }, req);
    
    return res.json({ success: true, message: 'Check-In successful.', late_return, requestId });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approval Route
router.post('/:id/approve', authorizePermissions('APPROVE_GATEPASS'), async (req: any, res: any) => {
  try {
    const { status, remarks, approvalLevel } = req.body;
    const userId = req.user?.id || 1;
    const requestId = req.params.id;

    // Update main request status if final or as needed
    await db.execute(
      'UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?',
      [status, requestId]
    );

    // Insert into approvals table
    await db.execute(
      'INSERT INTO gatepass_approvals (request_id, approver_id, approval_level, status, remarks) VALUES (?, ?, ?, ?, ?)',
      [requestId, userId, approvalLevel || 1, status, remarks]
    );

    // Audit Log
    await logAudit(userId, 'GATEPASS_APPROVAL', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, null, { status, remarks }, req);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Movement Log
router.post('/:id/movement', authorizePermissions('PROCESS_GATEPASS_MOVEMENT'), async (req: any, res: any) => {
  try {
    const { movementType, securityGuardId, verificationMode } = req.body;
    const userId = req.user?.id || securityGuardId || 1;
    const requestId = req.params.id;
    const vMode = verificationMode || 'QR_SCAN';

    // Fetch current request details
    const [requestData]: any = await db.query(
      'SELECT current_status, expected_return_time, requested_exit_time FROM gatepass_requests WHERE request_id = ?',
      [requestId]
    );

    if (!requestData || requestData.length === 0) {
      return res.status(404).json({ error: 'Gatepass not found' });
    }

    const { current_status, expected_return_time } = requestData[0];
    const now = new Date();
    const expectedReturn = expected_return_time ? new Date(expected_return_time) : null;

    if (movementType === 'EXIT') {
      if (current_status !== 'APPROVED') {
        return res.status(400).json({ error: 'Pass is not APPROVED or has already been used' });
      }
      
      // PRE-USE: Safety-Net - if currently past expected return time
      if (expectedReturn && now > expectedReturn) {
        await db.execute('UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?', ['VOID', requestId]);
        await logAudit(userId, 'GATEPASS_MOVEMENT', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, { current_status }, { current_status: 'VOID', note: 'Safety-Net Voided (Expired before use)' }, req);
        return res.status(400).json({ error: 'Pass has expired before use and has been VOIDED.' });
      }

      await db.execute(
        'INSERT INTO gatepass_movements (request_id, exit_time, security_guard_id, verification_mode, verified_by_user_id) VALUES (?, NOW(), ?, ?, ?)',
        [requestId, userId, vMode, userId]
      );
      
      await db.execute('UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?', ['OUT', requestId]);
      await logAudit(userId, 'GATEPASS_MOVEMENT', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, { current_status }, { current_status: 'OUT', movementType: 'EXIT' }, req);

      if (vMode === 'ADMIN_OVERRIDE') {
        io.emit('notification', {
          title: 'Security Alert: Admin Override',
          message: `Manual check-out override used for Gatepass ID ${requestId} by user ${userId}.`,
          type: 'warning',
          role: ['SECURITY_SUPERVISOR', 'HOD', 'SUPER_ADMIN']
        });
      }

      return res.json({ success: true, message: 'Check-Out successful.' });

    } else if (movementType === 'ENTRY') {
      if (current_status !== 'OUT') {
        return res.status(400).json({ error: 'Cannot Check-In. Staff is not checked out on this pass.' });
      }

      // RE-ENTRY: allowed regardless of time.
      let late_return = false;
      if (expectedReturn) {
         let graceMins = 0;
         try {
            const [settings]: any = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'grace_period_mins'");
            if (settings.length > 0 && settings[0].setting_value) {
                const parsed = parseInt(settings[0].setting_value, 10);
                if (!isNaN(parsed) && parsed > 0) graceMins = parsed;
            }
         } catch (e) { console.error("Could not fetch grace_period_mins", e); }
         
         const threshold = new Date(expectedReturn.getTime() + graceMins * 60 * 1000);
         if (now > threshold) {
            late_return = true;
         }
      }

      // Update the latest movement record
      await db.execute(
        'UPDATE gatepass_movements SET entry_time = NOW(), late_return = ?, verification_mode = ?, verified_by_user_id = ? WHERE request_id = ? AND entry_time IS NULL ORDER BY movement_id DESC LIMIT 1',
        [late_return, vMode, userId, requestId]
      );

      // Log Violation if late
      if (late_return) {
         const [lastMovement]: any = await db.query('SELECT movement_id FROM gatepass_movements WHERE request_id = ? ORDER BY movement_id DESC LIMIT 1', [requestId]);
         if(lastMovement && lastMovement.length > 0) {
           await db.execute(
             'INSERT INTO gatepass_violations (request_id, movement_id, violation_type, severity, description) VALUES (?, ?, ?, ?, ?)',
             [requestId, lastMovement[0].movement_id, 'LATE_RETURN', 'MEDIUM', 'Employee returned after expected time.']
           );
         }
      }

      // Update request to RETURNED (closed state)
      await db.execute('UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?', ['RETURNED', requestId]);
      
      await logAudit(userId, 'GATEPASS_MOVEMENT', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, { current_status }, { current_status: 'RETURNED', movementType: 'ENTRY', late_return }, req);

      if (vMode === 'ADMIN_OVERRIDE') {
        io.emit('notification', {
          title: 'Security Alert: Admin Override',
          message: `Manual check-in override used for Gatepass ID ${requestId} by user ${userId}.`,
          type: 'warning',
          role: ['SECURITY_SUPERVISOR', 'HOD', 'SUPER_ADMIN']
        });
      }

      return res.json({ success: true, message: 'Check-In successful.', late_return });
    } else {
      return res.status(400).json({ error: 'Invalid movement type.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approval History

router.get('/lookup', authorizePermissions('PROCESS_GATEPASS_MOVEMENT', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { qr, empId, code } = req.query;
    let query = '';
    let params: any[] = [];
    
    if (code) {
      // Rate limiting block
      const [attemptsInfo]: any = await db.query(
        'SELECT count(*) as count FROM code_verification_attempts WHERE ip_address = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND is_successful = FALSE',
        [req.ip]
      );
      if (attemptsInfo[0] && attemptsInfo[0].count >= 5) {
         return res.status(429).json({ error: 'Too many invalid manual code attempts. Please wait 15 mins.' });
      }

      query = 'SELECT r.*, e.first_name, e.last_name FROM gatepass_requests r JOIN hr_employees e ON r.employee_id = e.employee_id WHERE r.secret_pass_code = ?';
      params = [code];
    } else if (qr) {
      // Validate JWT
      let decoded: any;
      try {
        decoded = jwt.verify(qr as string, JWT_SECRET);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid or forged QR token' });
      }
      query = 'SELECT r.*, e.first_name, e.last_name FROM gatepass_requests r JOIN hr_employees e ON r.employee_id = e.employee_id WHERE r.request_id = ?';
      params = [decoded.request_id];
    } else if (empId) {
      query = 'SELECT r.*, e.first_name, e.last_name FROM gatepass_requests r JOIN hr_employees e ON r.employee_id = e.employee_id WHERE e.employee_code = ? ORDER BY r.request_id DESC LIMIT 1';
      params = [empId];
    } else {
      return res.status(400).json({ error: 'Provide qr, empId, or code' });
    }

    const [rows]: any = await db.query(query, params);
    if (!rows || rows.length === 0) {
      if (code && req.user?.id) {
         // Log failed code attempt
         await db.execute('INSERT INTO code_verification_attempts (user_id, ip_address, secret_code_attempt, is_successful) VALUES (?, ?, ?, ?)', 
           [req.user.id, req.ip, code, false]
         );
      }
      return res.status(404).json({ error: 'Pass not found or invalid' });
    }
    
    if (code && req.user?.id) {
       await db.execute('INSERT INTO code_verification_attempts (user_id, ip_address, secret_code_attempt, is_successful) VALUES (?, ?, ?, ?)', 
         [req.user.id, req.ip, code, true]
       );
    }
    
    const pass = rows[0];
    res.json({
        id: pass.request_id,
        type: pass.request_type,
        employeeName: (pass.first_name + ' ' + (pass.last_name || '')).trim(),
        status: pass.current_status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', async (req: any, res: any) => {
  try {
    const [approvals] = await db.query(`
      SELECT a.*, u.username as approver_name 
      FROM gatepass_approvals a
      LEFT JOIN auth_users u ON a.approver_id = u.id
      WHERE a.request_id = ?
      ORDER BY a.approval_time ASC
    `, [req.params.id]);

    const [movements] = await db.query(`
      SELECT m.*, u.username as guard_name
      FROM gatepass_movements m
      LEFT JOIN auth_users u ON m.security_guard_id = u.id
      WHERE m.request_id = ?
      ORDER BY m.movement_time ASC
    `, [req.params.id]);

    res.json({ approvals, movements });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User's own requests with details
router.get('/my-requests', async (req: any, res: any) => {
  try {
    const userId = req.user?.id || 1;
    // For demo, we might need a way to link User to Employee
    // Assuming auth_users.username might match employee_code or similar
    // Here we'll just fetch all for now or filter by a fixed employee_id for demo
    const [rows]: any = await db.query(`
      SELECT * FROM gatepass_requests 
      WHERE employee_id = 1 
      ORDER BY created_at DESC
    `);

    // Attach history to each
    for (const r of rows) {
      const [approvals] = await db.query(`
        SELECT a.*, u.username as approver_name 
        FROM gatepass_approvals a
        LEFT JOIN auth_users u ON a.approver_id = u.id
        WHERE a.request_id = ?
        ORDER BY a.approval_time ASC
      `, [r.request_id]);
      
      const [movements] = await db.query(`
        SELECT m.*, u.username as guard_name
        FROM gatepass_movements m
        LEFT JOIN auth_users u ON m.security_guard_id = u.id
        WHERE m.request_id = ?
        ORDER BY m.movement_id ASC
      `, [r.request_id]);

      r.approvals = approvals;
      r.movements = movements;
    }

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
