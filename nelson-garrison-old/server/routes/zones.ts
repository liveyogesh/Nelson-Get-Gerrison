import { Router } from 'express';
import db from '../db.js';
import { logAudit, authenticateToken, authorizePermissions, auditMiddleware, scopeFacility, checkActiveShift } from '../middleware/auth.js';
import { io } from '../index.js';

const router = Router();

router.use(authenticateToken);
router.use(scopeFacility);
router.use(checkActiveShift);

// --- Restricted Zones Management ---

router.get('/', authorizePermissions('VIEW_RESTRICTED_ZONES', 'MANAGE_RESTRICTED_ZONES'), async (req: any, res: any) => {
  try {
    let query = `
      SELECT r.*, f.facility_name 
      FROM restricted_zones r
      LEFT JOIN org_facilities f ON r.facility_id = f.facility_id
      WHERE r.deleted_at IS NULL
    `;
    const params: any[] = [];
    
    if (!req.isCorporate) {
      if (req.facilities && req.facilities.length > 0) {
        query += ` AND r.facility_id IN (${req.facilities.map(() => '?').join(',')})`;
        params.push(...req.facilities);
      } else {
        query += ` AND 1=0`;
      }
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorizePermissions('MANAGE_RESTRICTED_ZONES'), async (req: any, res: any) => {
  try {
    const { facility_id, zone_code, zone_name, description, approval_required, active_status } = req.body;
    
    // Check if code exists
    const [existing]: any = await db.query('SELECT zone_id FROM restricted_zones WHERE zone_code = ? AND deleted_at IS NULL', [zone_code]);
    if (existing.length > 0) {
       return res.status(400).json({ error: 'Zone code already exists.' });
    }

    const [result]: any = await db.execute(
      `INSERT INTO restricted_zones (facility_id, zone_code, zone_name, description, approval_required, active_status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [facility_id, zone_code, zone_name, description, approval_required, active_status]
    );

    await logAudit(req.user.id, 'CREATE_ZONE', 'ZONES', 'restricted_zones', result.insertId, null, req.body, req);

    res.json({ success: true, zone_id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authorizePermissions('MANAGE_RESTRICTED_ZONES'), auditMiddleware('ZONES', 'restricted_zones', 'zone_id'), async (req: any, res: any) => {
  try {
    const { facility_id, zone_code, zone_name, description, approval_required, active_status } = req.body;
    
    const [result]: any = await db.execute(
      `UPDATE restricted_zones 
       SET facility_id=?, zone_code=?, zone_name=?, description=?, approval_required=?, active_status=?
       WHERE zone_id=?`,
      [facility_id, zone_code, zone_name, description, approval_required, active_status, req.params.id]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authorizePermissions('MANAGE_RESTRICTED_ZONES'), async (req: any, res: any) => {
  try {
    await db.execute('UPDATE restricted_zones SET deleted_at=NOW() WHERE zone_id=?', [req.params.id]);
    await logAudit(req.user.id, 'DELETE_ZONE', 'ZONES', 'restricted_zones', req.params.id, null, null, req);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- Restricted Zone Access Logs ---

router.get('/logs', authorizePermissions('VIEW_RESTRICTED_ZONES', 'GRANT_ZONE_ACCESS'), async (req: any, res: any) => {
  try {
    let query = `
      SELECT l.*, z.zone_name, z.zone_code,
        CASE
           WHEN l.person_type = 'EMPLOYEE' THEN (SELECT first_name FROM hr_employees WHERE employee_id = l.person_reference_id)
           WHEN l.person_type = 'VISITOR' THEN (SELECT full_name FROM visitor_master WHERE visitor_id = l.person_reference_id)
        END as person_name,
        u.username as authorized_by_name
      FROM restricted_zone_access_logs l
      LEFT JOIN restricted_zones z ON l.zone_id = z.zone_id
      LEFT JOIN auth_users u ON l.authorized_by_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (!req.isCorporate) {
      if (req.facilities && req.facilities.length > 0) {
        query += ` AND z.facility_id IN (${req.facilities.map(() => '?').join(',')})`;
        params.push(...req.facilities);
      } else {
        query += ` AND 1=0`;
      }
    }

    if (req.query.date) {
       query += ` AND DATE(l.access_time) = ?`;
       params.push(req.query.date);
    }
    
    if (req.query.violation_flag) {
       query += ` AND l.violation_flag = ?`;
       // parse bool
       params.push(req.query.violation_flag === 'true' ? 1 : 0);
    }

    if (req.query.sort === 'asc') {
       query += ` ORDER BY l.access_time ASC`;
    } else {
       query += ` ORDER BY l.access_time DESC`;
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logs', authorizePermissions('GRANT_ZONE_ACCESS'), async (req: any, res: any) => {
  try {
    const { zone_id, person_type, person_reference_id, access_granted, violation_flag, denial_reason } = req.body;
    
    const [result]: any = await db.execute(
      `INSERT INTO restricted_zone_access_logs (zone_id, person_type, person_reference_id, access_granted, violation_flag, denial_reason, authorized_by_user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [zone_id, person_type, person_reference_id, access_granted, violation_flag, denial_reason || null, req.user.id]
    );

    if (violation_flag) {
      // Trigger notification for SECURITY_SUPERVISOR and HODs
      // First, find users with these roles
      const [managers]: any = await db.query(`
        SELECT DISTINCT u.id 
        FROM auth_users u
        JOIN auth_user_roles ur ON u.id = ur.user_id
        JOIN auth_roles r ON ur.role_id = r.id
        WHERE r.role_code IN ('SECURITY_SUPERVISOR', 'HOD', 'SUPER_ADMIN')
      `);

      const message = `Violation recorded trying to access Zone ID ${zone_id} by ${person_type} ${person_reference_id}`;
      
      io.emit('notification', {
        title: 'Security Alert: Unauthorized Access Attempt',
        message: message,
        type: 'danger',
        role: ['SECURITY_SUPERVISOR', 'HOD', 'SUPER_ADMIN', 'SECURITY_GUARD']
      });

      for (const m of managers) {
         // Create system notification
         const [notifResult]: any = await db.execute(
           'INSERT INTO system_notifications (recipient_user_id, notification_type, message) VALUES (?, ?, ?)',
           [m.id, 'ZONE_VIOLATION', message]
         );
         // Queue it for IN_APP
         await db.execute(
           'INSERT INTO notification_queue (notification_id, recipient_user_id, channel) VALUES (?, ?, ?)',
           [notifResult.insertId, m.id, 'IN_APP']
         );
      }
    }

    res.json({ success: true, log_id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
