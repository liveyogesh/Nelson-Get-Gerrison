import express from 'express';
import db from '../db.js';
import { authenticateToken, authorizePermissions, logAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/compliance/policies
 * @desc    Get all active compliance policies
 * @access  Private
 */
router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const [policies] = await db.query(`
      SELECT policy_id, policy_name, version, effective_date 
      FROM policy_versions 
      WHERE is_active = TRUE
    `);
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

/**
 * @route   POST /api/compliance/acknowledge
 * @desc    Record employee acknowledgement of a policy
 * @access  Private
 */
router.post('/acknowledge', authenticateToken, async (req, res) => {
  const { policy_id, employee_id } = req.body;

  if (!policy_id || !employee_id) {
    return res.status(400).json({ error: 'policy_id and employee_id are required' });
  }

  // TODO: Verify that (req as any).user.id matches employee_id or the user has HR privileges

  const connection = await db.getConnection();
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const deviceInfo = req.headers['user-agent'] || 'unknown';

    await connection.query(`
      INSERT INTO employee_policy_acknowledgements (employee_id, policy_id, ip_address, device_info)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE acknowledged_at = CURRENT_TIMESTAMP, ip_address = ?, device_info = ?
    `, [employee_id, policy_id, ipAddress, deviceInfo, ipAddress, deviceInfo]);

    logAudit(
      (req as any).user?.id || null,
      'ACKNOWLEDGE_POLICY',
      'compliance',
      'policy_versions',
      policy_id,
      null, // old_value
      { employee_id }, // new_value
      req
    );

    res.json({ message: 'Policy acknowledged successfully' });
  } catch (error) {
    console.error('Error acknowledging policy:', error);
    res.status(500).json({ error: 'Failed to acknowledge policy' });
  } finally {
    connection.release();
  }
});

export default router;
