import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, authorizePermissions } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const [rows]: any = await db.query('SELECT setting_key, setting_value FROM system_settings');
    const config: any = {};
    for (const row of rows) config[row.setting_key] = row.setting_value;
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { escalation_enabled, escalation_timeout_mins, grace_period_mins, visitor_expiry_warning_mins } = req.body;
    
    const settings: any = {
        escalation_enabled: escalation_enabled ? 'true' : 'false',
        escalation_timeout_mins: (escalation_timeout_mins || 15).toString(),
        grace_period_mins: (grace_period_mins || 15).toString(),
        visitor_expiry_warning_mins: (visitor_expiry_warning_mins || 15).toString()
    };

    for (const [key, value] of Object.entries(settings)) {
        await db.query(
            `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = ?`,
            [key, value, value]
        );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
