import express from 'express';
import pool from '../db.js';
import { authenticateToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

router.get('/audit', authenticateToken, authorizePermissions('system.audit.view'), async (req: any, res) => {
    try {
        
        const { action, module, userId, startDate, endDate, limit = 100 } = req.query;
        let query = `
            SELECT a.*, u.username, u.email 
            FROM audit_logs a
            LEFT JOIN auth_users u ON a.user_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];
        
        if (action) {
            query += ' AND a.action = ?';
            params.push(action);
        }
        if (module) {
            query += ' AND a.module = ?';
            params.push(module);
        }
        if (userId) {
            query += ' AND a.user_id = ?';
            params.push(userId);
        }
        if (startDate) {
            query += ' AND a.created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND a.created_at <= ?';
            params.push(endDate);
        }
        
        query += ' ORDER BY a.created_at DESC LIMIT ?';
        params.push(Number(limit));
        
        const [logs]: any = await pool.query(query, params);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// Helper for generating custom logs via client if needed
router.post('/audit', authenticateToken, async (req: any, res) => {
    try {
        const { action, module, resource_id, old_values, new_values } = req.body;
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, module, resource_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                req.user.id, 
                action, 
                module, 
                resource_id, 
                JSON.stringify(old_values), 
                JSON.stringify(new_values), 
                req.ip, 
                req.headers['user-agent']
            ]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create audit log' });
    }
});

export default router;
