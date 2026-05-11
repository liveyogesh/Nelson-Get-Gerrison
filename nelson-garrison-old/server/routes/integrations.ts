import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, authorizePermissions, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);
router.use(authorizePermissions('SUPER_ADMIN')); // High-level IT config

// Get integrations
router.get('/', async (req: any, res: any) => {
  try {
    const [rows]: any = await db.query('SELECT integration_id, system_name, system_type, endpoint_url, auth_type, sync_frequency_mins, last_sync_at, status, created_at, updated_at FROM external_integrations');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update integration
router.post('/', async (req: any, res: any) => {
  try {
    const { system_name, system_type, endpoint_url, auth_type, auth_credentials, sync_frequency_mins } = req.body;
    
    // Validate credentials JSON
    const credsJson = typeof auth_credentials === 'string' ? auth_credentials : JSON.stringify(auth_credentials);
    
    const [result]: any = await db.query(
      `INSERT INTO external_integrations (system_name, system_type, endpoint_url, auth_type, auth_credentials, sync_frequency_mins)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [system_name, system_type, endpoint_url, auth_type, credsJson, sync_frequency_mins || 60]
    );
    
    await logAudit(req.user.id, 'CREATE', 'INTEGRATIONS', 'external_integrations', result.insertId, null, { system_name, system_type, endpoint_url }, req);
    
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', async (req: any, res: any) => {
    try {
      const { status } = req.body;
      await db.query('UPDATE external_integrations SET status = ? WHERE integration_id = ?', [status, req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
