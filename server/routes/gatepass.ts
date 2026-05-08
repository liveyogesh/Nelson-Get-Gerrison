import express from 'express';
import pool from '../db.js';
import { authenticateToken, authorizePermissions, facilityScopeGuard } from '../middleware/auth.js';

const router = express.Router();

// Fetch Scoped Gatepass Requests
router.get('/requests', authenticateToken, async (req: any, res) => {
    try {
        const { role, id: userId, scope } = req.user;
        let query = `
            SELECT r.*, e.first_name, e.last_name, f.facility_name
            FROM gatepass_requests r
            JOIN hr_employees e ON r.employee_id = e.employee_id
            JOIN org_facilities f ON r.facility_id = f.facility_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (role === 'SUPER_ADMIN' || role === 'CORPORATE_ADMIN' || scope === 'CORPORATE') {
            // No filter
        } else if (role === 'FACILITY_ADMIN' || role === 'SECHOD') {
            const [access]: any = await pool.query('SELECT facility_id FROM employee_facility_access WHERE user_id = ?', [userId]);
            const facIds = access.map((a: any) => a.facility_id);
            if (facIds.length) {
                query += ` AND r.facility_id IN (${facIds.join(',')})`;
            } else {
                query += ' AND 1=0';
            }
        } else {
            query += ' AND r.employee_id = (SELECT employee_id FROM hr_employee_user_mapping WHERE user_id = ?)';
            params.push(userId);
        }

        query += ' ORDER BY r.requested_at DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching requests' });
    }
});

router.post('/requests/:id/approve', authenticateToken, authorizePermissions('gatepass.approve'), async (req: any, res) => {
    try {
        const { role, id: userId } = req.user;
        const reqId = req.params.id;
        
        await pool.query('UPDATE gatepass_requests SET status = "APPROVED" WHERE id = ?', [reqId]);
        await pool.query(
            'INSERT INTO gatepass_approvals (request_id, approver_id, status, remarks) VALUES (?, ?, ?, ?)',
            [reqId, userId, 'APPROVED', req.body.remarks || 'Approved by ' + role]
        );
        res.json({ success: true, message: 'Gatepass Approved' });
    } catch (err) {
        res.status(500).json({ message: 'Error approving request' });
    }
});

router.post('/requests/:id/reject', authenticateToken, authorizePermissions('gatepass.approve'), async (req: any, res) => {
    try {
        const { role, id: userId } = req.user;
        const reqId = req.params.id;
        
        await pool.query('UPDATE gatepass_requests SET status = "REJECTED" WHERE id = ?', [reqId]);
        await pool.query(
            'INSERT INTO gatepass_approvals (request_id, approver_id, status, remarks) VALUES (?, ?, ?, ?)',
            [reqId, userId, 'REJECTED', req.body.remarks || 'Rejected by ' + role]
        );
        res.json({ success: true, message: 'Gatepass Rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Error rejecting request' });
    }
});

import crypto from 'crypto';

// Secret for QR code signature. In production, this should be an env variable.
const QR_SECRET = process.env.QR_SECRET || 'super-secure-qr-secret-key';

// GET endpoint to fetch a single request and generate QR code
router.get('/requests/:id/qr', authenticateToken, async (req: any, res) => {
    try {
        const reqId = req.params.id;
        const [rows]: any = await pool.query('SELECT status, id FROM gatepass_requests WHERE id = ?', [reqId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
        
        const request = rows[0];
        if (request.status !== 'APPROVED') {
            return res.status(400).json({ message: 'Gatepass not approved yet' });
        }
        
        // Expiry timestamp (e.g., valid for 24 hours from generation)
        const expiry = Date.now() + 24 * 60 * 60 * 1000;
        
        // Generate signature
        const payload = `${request.id}:${expiry}`;
        const signature = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex');
        const qrData = JSON.stringify({ id: request.id, expiry, signature });

        res.json({ success: true, qrData });
    } catch (err) {
        res.status(500).json({ message: 'Error generating QR' });
    }
});

router.post('/scan', authenticateToken, authorizePermissions('gatepass.scan'), async (req: any, res) => {
    try {
        const { qrData } = req.body;
        if (!qrData) return res.status(400).json({ message: 'Missing QR data' });

        let data;
        try {
            data = JSON.parse(qrData);
        } catch(e) {
            return res.status(400).json({ message: 'Invalid QR format' });
        }

        const { id, expiry, signature } = data;
        
        // Verify expiry
        if (Date.now() > expiry) {
            return res.status(400).json({ message: 'QR Code Expired' });
        }

        // Verify signature
        const expectedSignature = crypto.createHmac('sha256', QR_SECRET).update(`${id}:${expiry}`).digest('hex');
        if (signature !== expectedSignature) {
             return res.status(400).json({ message: 'Invalid QR Signature' });
        }

        const [rows]: any = await pool.query('SELECT status FROM gatepass_requests WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Gatepass not found' });

        if (rows[0].status !== 'APPROVED') {
            return res.status(400).json({ message: `Gatepass is ${rows[0].status}`});
        }

        res.json({ success: true, message: 'Valid gatepass', id });
    } catch (err) {
        res.status(500).json({ message: 'Error verifying QR code' });
    }
});

router.post('/request', authenticateToken, authorizePermissions('gatepass.create'), async (req: any, res) => {
  const { requestType, reason, isPriority } = req.body;
  const userId = req.user.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get Employee Mapping and Primary Facility
    const [mapping]: any = await connection.query(`
      SELECT e.employee_id, e.department_id, fa.facility_id 
      FROM hr_employee_user_mapping m
      JOIN hr_employees e ON m.employee_id = e.employee_id
      JOIN employee_facility_access fa ON m.user_id = fa.user_id
      WHERE m.user_id = ?
      LIMIT 1
    `, [userId]);

    if (!mapping.length) {
      return res.status(404).json({ message: 'Employee or Facility mapping not found' });
    }

    const { employee_id: employeeId, facility_id: facilityId } = mapping[0];

    // 2. Check Quota (Simplified)
    if (requestType === 'Personal') {
      const [emp]: any = await connection.query('SELECT monthly_quota FROM hr_employees WHERE employee_id = ?', [employeeId]);
      const [usage]: any = await connection.query(
        'SELECT COUNT(*) as count FROM gatepass_requests WHERE employee_id = ? AND request_type = "Personal" AND status != "REJECTED" AND MONTH(requested_at) = MONTH(CURRENT_DATE())',
        [employeeId]
      );

      if (usage[0].count >= (emp[0]?.monthly_quota || 3)) {
        return res.status(400).json({ message: 'Monthly quota exceeded' });
      }
    }

    // 3. Create Request
    const [result]: any = await connection.query(
      'INSERT INTO gatepass_requests (employee_id, facility_id, request_type, reason, is_priority, status) VALUES (?, ?, ?, ?, ?, ?)',
      [employeeId, facilityId, requestType, reason, isPriority, 'PENDING']
    );

    const requestId = result.insertId;

    // 4. Automated Multi-Facility Approval Matrix (Enterprise Enhancement)
    const [matrix]: any = await connection.query(`
        SELECT * FROM workflow_approval_matrix 
        WHERE workflow_type = 'GATEPASS' AND (facility_id = ? OR facility_id IS NULL)
        ORDER BY facility_id DESC, approval_order ASC
    `, [facilityId]);

    if (matrix.length > 0) {
        // Log the first required approval role to the system log for this request
        // in a production app, we'd insert into gatepass_approvals for each matrix entry
    }

    await connection.commit();
    res.json({ success: true, requestId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
