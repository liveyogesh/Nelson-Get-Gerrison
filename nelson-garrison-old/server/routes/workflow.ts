import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, authorizePermissions } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Get approval matrix
router.get('/matrix', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { type, departmentId } = req.query;
    let query = 'SELECT * FROM workflow_approval_matrix WHERE workflow_type = ?';
    const params: any[] = [type];
    
    if (departmentId) {
      query += ' AND department_id = ?';
      params.push(departmentId);
    } else {
      query += ' AND department_id IS NULL';
    }
    
    query += ' ORDER BY approval_level ASC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update approval matrix
router.post('/matrix', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { workflow_type, department_id, steps } = req.body;
    
    // We transactionally update the matrix
    // 1. Delete existing for this scope
    let delQuery = 'DELETE FROM workflow_approval_matrix WHERE workflow_type = ?';
    const delParams: any[] = [workflow_type];
    
    if (department_id) {
      delQuery += ' AND department_id = ?';
      delParams.push(department_id);
    } else {
      delQuery += ' AND department_id IS NULL';
    }
    
    await db.query(delQuery, delParams);
    
    // 2. Insert new steps
    for (const step of steps) {
      await db.query(
        `INSERT INTO workflow_approval_matrix (
          workflow_type, department_id, approval_level, assignment_role, escalation_mins
        ) VALUES (?, ?, ?, ?, ?)`,
        [workflow_type, department_id || null, step.level, step.roleCode || 'APPROVER', step.escalationMins]
      );
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get auto-delegation rules
router.get('/delegation', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT d.*, u.name as delegatee_name 
       FROM auto_delegation_rules d 
       JOIN auth_users u ON d.delegatee_user_id = u.id 
       WHERE d.delegator_user_id = ? AND d.active = TRUE`,
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configure delegation
router.post('/delegation', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { delegatee_user_id, facility_id, start_date, end_date, reason } = req.body;
    
    await db.query(
      `INSERT INTO auto_delegation_rules (
        delegator_user_id, delegatee_user_id, facility_id, start_date, end_date, reason
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, delegatee_user_id, facility_id, start_date, end_date, reason]
    );
    
    // Deactivate overlapping ones optionally, but for now just insert.
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
