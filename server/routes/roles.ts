import express from 'express';
import pool from '../db.js';
import { authenticateToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

router.get('/roles', authenticateToken, authorizePermissions('roles.view', 'system.settings.view'), async (req: any, res) => {
    try {
        const [roles]: any = await pool.query('SELECT * FROM auth_roles');
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

router.post('/roles', authenticateToken, authorizePermissions('roles.manage'), async (req: any, res) => {
    try {
        const { role_name, role_code } = req.body;
        const [result]: any = await pool.query('INSERT INTO auth_roles (role_name, role_code) VALUES (?, ?)', [role_name, role_code]);
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create role' });
    }
});

router.put('/roles/:id', authenticateToken, authorizePermissions('roles.manage'), async (req: any, res) => {
    try {
        const { role_name, role_code } = req.body;
        await pool.query('UPDATE auth_roles SET role_name = ?, role_code = ? WHERE id = ?', [role_name, role_code, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update role' });
    }
});

router.delete('/roles/:id', authenticateToken, authorizePermissions('roles.manage'), async (req: any, res) => {
    try {
        // Also delete associations
        await pool.query('DELETE FROM auth_role_permissions WHERE role_id = ?', [req.params.id]);
        await pool.query('DELETE FROM auth_roles WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

// Permissions
router.get('/permissions', authenticateToken, authorizePermissions('roles.view', 'roles.permissions.assign'), async (req: any, res) => {
    try {
        const [permissions]: any = await pool.query('SELECT * FROM auth_permissions');
        res.json(permissions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});

router.post('/roles/:id/permissions', authenticateToken, authorizePermissions('roles.permissions.assign'), async (req: any, res) => {
    try {
        const roleId = req.params.id;
        const { permission_ids } = req.body; // array of IDs
        
        await pool.query('DELETE FROM auth_role_permissions WHERE role_id = ?', [roleId]);
        
        if (permission_ids && permission_ids.length > 0) {
            const values = permission_ids.map((id: number) => [roleId, id]);
            await pool.query('INSERT INTO auth_role_permissions (role_id, permission_id) VALUES ?', [values]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update role permissions' });
    }
});

router.get('/roles/:id/permissions', authenticateToken, authorizePermissions('roles.view', 'roles.permissions.assign'), async (req: any, res) => {
    try {
        const [rows]: any = await pool.query('SELECT permission_id FROM auth_role_permissions WHERE role_id = ?', [req.params.id]);
        res.json(rows.map((r: any) => r.permission_id));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
});

export default router;
