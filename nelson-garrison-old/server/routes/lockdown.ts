import express from 'express';
import db from '../db.js';
import { authenticateToken, authorizePermissions, logAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/lockdown/initiate
 * @desc    Initiate an emergency lockdown for a facility
 * @access  Private (Requires EMERGENCY_LOCKDOWN_INITIATE permission)
 */
router.post('/initiate', authenticateToken, authorizePermissions('EMERGENCY_LOCKDOWN_INITIATE'), async (req, res) => {
  const { facility_id, reason, lockdown_level, gate_rules, broadcast_message } = req.body;

  if (!facility_id || !reason) {
    return res.status(400).json({ error: 'facility_id and reason are required' });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Create Lockdown Record
    const [lockdownResult]: any = await connection.query(`
      INSERT INTO emergency_lockdowns (facility_id, initiated_by, reason, lockdown_level, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
    `, [facility_id, req.user!.id, reason, lockdown_level || 'FULL']);
    
    const lockdownId = lockdownResult.insertId;

    // 2. Insert Gate Rules if provided
    if (gate_rules && Array.isArray(gate_rules) && gate_rules.length > 0) {
      for (const rule of gate_rules) {
        await connection.query(`
          INSERT INTO lockdown_gate_rules (lockdown_id, target_gate_id, action)
          VALUES (?, ?, ?)
        `, [lockdownId, rule.target_gate_id || null, rule.action]);
      }
    } else {
      // Default rule: block all gates
      await connection.query(`
        INSERT INTO lockdown_gate_rules (lockdown_id, target_gate_id, action)
        VALUES (?, NULL, 'BLOCK_ALL')
      `, [lockdownId]);
    }

    // 3. Insert Broadcast Message if provided
    if (broadcast_message) {
      await connection.query(`
        INSERT INTO emergency_broadcasts (lockdown_id, message)
        VALUES (?, ?)
      `, [lockdownId, broadcast_message]);

      // TODO: Actually emit the broadcast via Socket.IO
    }

    await connection.commit();

    logAudit(
      req.user!.id,
      'INITIATE_LOCKDOWN',
      'org_facilities',
      facility_id,
      { lockdownId, reason, lockdown_level },
      req.ip || req.socket.remoteAddress || 'unknown'
    );

    res.status(201).json({ message: 'Emergency lockdown initiated', lockdown_id: lockdownId });
  } catch (error) {
    await connection.rollback();
    console.error('Error initiating lockdown:', error);
    res.status(500).json({ error: 'Failed to initiate lockdown' });
  } finally {
    connection.release();
  }
});

/**
 * @route   POST /api/lockdown/:id/resolve
 * @desc    Resolve an active emergency lockdown
 * @access  Private (Requires EMERGENCY_LOCKDOWN_RESOLVE permission)
 */
router.post('/:id/resolve', authenticateToken, authorizePermissions('EMERGENCY_LOCKDOWN_RESOLVE'), async (req, res) => {
  const lockdownId = req.params.id;

  try {
    const [result]: any = await db.query(`
      UPDATE emergency_lockdowns 
      SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = ? 
      WHERE lockdown_id = ? AND status = 'ACTIVE'
    `, [req.user!.id, lockdownId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Active lockdown not found' });
    }

    logAudit(
      req.user!.id,
      'RESOLVE_LOCKDOWN',
      'emergency_lockdowns',
      parseInt(lockdownId),
      { resolved: true },
      req.ip || req.socket.remoteAddress || 'unknown'
    );

    res.json({ message: 'Lockdown resolved successfully' });
  } catch (error) {
    console.error('Error resolving lockdown:', error);
    res.status(500).json({ error: 'Failed to resolve lockdown' });
  }
});

/**
 * @route   GET /api/lockdown/active
 * @desc    Get currently active lockdowns
 * @access  Private
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    // Optionally scope by facility if the user is not a corporate admin
    const [activeLockdowns] = await db.query(`
      SELECT el.*, of.facility_name, au.username as initiated_by_name
      FROM emergency_lockdowns el
      JOIN org_facilities of ON el.facility_id = of.facility_id
      JOIN auth_users au ON el.initiated_by = au.id
      WHERE el.status = 'ACTIVE'
    `);
    
    res.json(activeLockdowns);
  } catch (error) {
    console.error('Error fetching active lockdowns:', error);
    res.status(500).json({ error: 'Failed to fetch active lockdowns' });
  }
});

export default router;
