import { Router } from 'express';
import db from '../db.js';
import { logAudit, authenticateToken, scopeFacility, checkActiveShift } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(scopeFacility);
router.use(checkActiveShift);

// Manage Visitor Types
router.get('/types', async (req: any, res: any) => {
  try {
    const [rows] = await db.query('SELECT * FROM visitor_types ORDER BY type_name ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/types', async (req: any, res: any) => {
  try {
    const { type_name, description, access_level } = req.body;
    const [result]: any = await db.execute(
      'INSERT INTO visitor_types (type_name, description, access_level) VALUES (?, ?, ?)',
      [type_name, description, access_level || 'STANDARD']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/types/:id', async (req: any, res: any) => {
  try {
    const { type_name, description, access_level, active_status } = req.body;
    await db.execute(
      'UPDATE visitor_types SET type_name = ?, description = ?, access_level = ?, active_status = ? WHERE type_id = ?',
      [type_name, description, access_level || 'STANDARD', active_status, req.params.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Blacklist Management
router.get('/blacklist', async (req: any, res: any) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, u.username as added_by_name 
      FROM visitor_blacklist b
      LEFT JOIN auth_users u ON b.added_by = u.id
      ORDER BY b.added_at DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/blacklist', async (req: any, res: any) => {
  try {
    const { mobile, reason } = req.body;
    const userId = req.user?.id || null;
    await db.execute(
      'INSERT INTO visitor_blacklist (mobile, reason, added_by) VALUES (?, ?, ?)',
      [mobile, reason, userId]
    );
    // Also update visitor_master if exists
    await db.execute('UPDATE visitor_master SET blacklist_status = TRUE WHERE mobile = ?', [mobile]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/blacklist/:mobile', async (req: any, res: any) => {
  try {
    await db.execute('DELETE FROM visitor_blacklist WHERE mobile = ?', [req.params.mobile]);
    await db.execute('UPDATE visitor_master SET blacklist_status = FALSE WHERE mobile = ?', [req.params.mobile]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Visitor Search and Registry
router.get('/registry', async (req: any, res: any) => {
  try {
    const { startDate, endDate, type, status, search } = req.query;
    let query = `
      SELECT v.*, vm.first_name, vm.last_name, vm.mobile, vm.visitor_type, vm.photo_url,
             e.first_name as host_first, e.last_name as host_last
      FROM visitor_visits v
      JOIN visitor_master vm ON v.visitor_id = vm.visitor_id
      LEFT JOIN hr_employees e ON v.host_employee_id = e.employee_id
      LEFT JOIN employee_facility_access efa ON e.employee_id = efa.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!req.isCorporate) {
      if (req.facilities && req.facilities.length > 0) {
        query += ` AND efa.facility_id IN (${req.facilities.map(() => '?').join(',')})`;
        params.push(...req.facilities);
      } else {
        query += ` AND 1=0`; // Block access if no facilities
      }
    }

    if (startDate && endDate) {
      query += ' AND DATE(v.check_in_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    if (type && type !== 'all') {
      query += ' AND vm.visitor_type = ?';
      params.push(type);
    }
    if (status && status !== 'all') {
      query += ' AND v.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (vm.first_name LIKE ? OR vm.last_name LIKE ? OR vm.mobile LIKE ? OR v.pass_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' GROUP BY v.visit_id ORDER BY v.check_in_time DESC'; // Group by required due to joins
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Visitor History
router.get('/history/:visitorId', async (req: any, res: any) => {
  try {
    const [rows] = await db.query(`
      SELECT v.*, e.first_name as host_first, e.last_name as host_last, d.department_name
      FROM visitor_visits v
      LEFT JOIN hr_employees e ON v.host_employee_id = e.employee_id
      LEFT JOIN hr_departments d ON v.department_id = d.department_id
      WHERE v.visitor_id = ?
      ORDER BY v.check_in_time DESC
    `, [req.params.visitorId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Employee Directory for Admin
router.get('/employees', async (req: any, res: any) => {
  try {
    const { search, departmentId, designationId, status } = req.query;
    let query = `
      SELECT e.*, d.department_name, des.designation_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON e.department_id = d.department_id
      LEFT JOIN hr_designations des ON e.designation_id = des.designation_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (search) {
      query += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (departmentId && departmentId !== 'all') {
      query += ' AND e.department_id = ?';
      params.push(departmentId);
    }
    if (designationId && designationId !== 'all') {
      query += ' AND e.designation_id = ?';
      params.push(designationId);
    }
    if (status && status !== 'all') {
      query += ' AND e.employment_status = ?';
      params.push(status);
    }
    query += ' ORDER BY e.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Employee
router.post('/employees', async (req: any, res: any) => {
  try {
    const { employee_code, first_name, last_name, email, mobile, department_id, designation_id, photo_url } = req.body;
    
    // Check if code exists
    const [existing]: any = await db.query('SELECT employee_id FROM hr_employees WHERE employee_code = ?', [employee_code]);
    if (existing.length > 0) {
       return res.status(400).json({ error: 'Employee code already exists.' });
    }

    const [result]: any = await db.execute(
      `INSERT INTO hr_employees (employee_code, first_name, last_name, email, mobile, department_id, designation_id, photo_url, employment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [employee_code, first_name, last_name, email, mobile, department_id, designation_id, photo_url]
    );
    res.json({ success: true, employee_id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update employee contact/photo (for admin)
router.put('/employees/:id', async (req: any, res: any) => {
  try {
    const { photo_url, employment_status } = req.body;
    await db.execute(
      'UPDATE hr_employees SET photo_url = ?, employment_status = ? WHERE employee_id = ?',
      [photo_url, employment_status, req.params.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all designations for filters
router.get('/hr/designations', async (req: any, res: any) => {
  try {
    const [rows] = await db.query('SELECT * FROM hr_designations ORDER BY designation_name ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all departments for filters
router.get('/hr/departments', async (req: any, res: any) => {
  try {
    const [rows] = await db.query('SELECT * FROM hr_departments WHERE active_status = TRUE ORDER BY department_name ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Visitor Check-out
router.post('/checkout/:visitId', async (req: any, res: any) => {
  try {
    await db.execute(
      'UPDATE visitor_visits SET actual_exit_time = NOW(), status = "CHECKED_OUT" WHERE visit_id = ?',
      [req.params.visitId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register New Visitor Visit
router.post('/register', async (req: any, res: any) => {
  try {
    const { first_name, last_name, mobile, visitor_type, id_proof_type, id_proof_number, photo_url, id_proof_url, host_employee_id, purpose, department_id } = req.body;
    
    // Check Blacklist FIRST
    const [blacklistCheck]: any = await db.query('SELECT reason FROM visitor_blacklist WHERE mobile = ?', [mobile]);
    if (blacklistCheck.length > 0) {
      return res.status(403).json({ error: 'Visit Denied. This person is on the restricted blacklist.', reason: blacklistCheck[0].reason });
    }

    // 1. Get or Create Visitor Master record
    let [visitor]: any = await db.query('SELECT visitor_id FROM visitor_master WHERE mobile = ?', [mobile]);
    let visitorId;
    
    if (visitor.length > 0) {
      visitorId = visitor[0].visitor_id;
      // Update if needed
      await db.execute(
        'UPDATE visitor_master SET first_name = ?, last_name = ?, visitor_type = ?, photo_url = ? WHERE visitor_id = ?',
        [first_name, last_name, visitor_type, photo_url, visitorId]
      );
    } else {
      const [result]: any = await db.execute(
        'INSERT INTO visitor_master (first_name, last_name, mobile, visitor_type, id_proof_type, id_proof_number, photo_url, id_proof_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, mobile, visitor_type, id_proof_type, id_proof_number, photo_url, id_proof_url]
      );
      visitorId = result.insertId;
    }

    // 2. Create Visit record
    const passNumber = `VP-${Date.now().toString().slice(-6)}`;
    await db.execute(
      'INSERT INTO visitor_visits (visitor_id, host_employee_id, department_id, purpose, check_in_time, status, pass_number) VALUES (?, ?, ?, ?, NOW(), "CHECKED_IN", ?)',
      [visitorId, host_employee_id, department_id, purpose, passNumber]
    );

    res.json({ success: true, passNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
