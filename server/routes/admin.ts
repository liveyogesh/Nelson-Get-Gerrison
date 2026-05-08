import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/users', authenticateToken, async (req: any, res) => {
    try {
        let query = 'SELECT auth_users.id, auth_users.first_name, auth_users.last_name, auth_users.employee_id, auth_users.role, auth_users.department FROM auth_users WHERE 1=1';
        
        const { role, scope, scope_id, id } = req.user;
        if (role !== 'SUPER_ADMIN' && role !== 'CORPORATE_ADMIN' && scope !== 'CORPORATE') {
            if (scope === 'FACILITY' && scope_id) {
                 query = 'SELECT u.id, u.first_name, u.last_name, u.employee_id, u.role, u.department FROM auth_users u JOIN employee_facility_access f on u.id = f.user_id WHERE f.facility_id = ' + pool.escape(scope_id);
            } else if (scope === 'DEPARTMENT' && scope_id) {
                 query += ` AND department_id = ${pool.escape(scope_id)} `; // Assuming department_id is part of user or accessible. But earlier only `department` existed. So maybe filtering.
            } else {
                 query = `SELECT u.id, u.first_name, u.last_name, u.employee_id, u.role, u.department FROM auth_users u JOIN employee_facility_access f on u.id = f.user_id WHERE f.facility_id IN (SELECT facility_id FROM employee_facility_access WHERE user_id = ${pool.escape(id)})`;
            }
        }
        
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get all roles
router.get('/roles', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM auth_roles');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching roles' });
    }
});

// Get all permissions
router.get('/permissions', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM auth_permissions');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching permissions' });
    }
});

// System Settings Management
router.get('/config', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Super Admin only' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM system_settings');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching system settings' });
    }
});

router.post('/config', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const { key, value } = req.body;
    try {
        await pool.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [key, value, value]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error updating setting' });
    }
});

// Shift Override Management
router.get('/shift/override', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SECHOD' && req.user.role !== 'FACILITY_ADMIN' && req.user.role !== 'HR_MANAGER') {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    try {
        const [rows] = await pool.query(`
            SELECT so.*, u.first_name, u.last_name, u.employee_id, sup.first_name as sup_first, sup.last_name as sup_last 
            FROM shift_overrides so
            JOIN auth_users u ON so.user_id = u.id
            JOIN auth_users sup ON so.supervisor_id = sup.id
            ORDER BY so.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching overrides' });
    }
});

router.post('/shift/override', authenticateToken, async (req: any, res) => {
    const { userId, reason, extendedUntil } = req.body;
    // Check if requester is a supervisor/admin
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SECHOD' && req.user.role !== 'FACILITY_ADMIN' && req.user.role !== 'HR_MANAGER') {
        return res.status(403).json({ message: 'Unauthorized to grant shift overrides' });
    }

    try {
        await pool.query(
            'INSERT INTO shift_overrides (user_id, supervisor_id, reason, extended_until) VALUES (?, ?, ?, ?)',
            [userId, req.user.id, reason, extendedUntil]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error granting shift override' });
    }
});

// Get permission matrix
router.get('/permissions/matrix', authenticateToken, async (req, res) => {
    try {
        const [rows]: any = await pool.query('SELECT role_id, permission_id FROM auth_role_permissions');
        const matrix: Record<string, number[]> = {};
        rows.forEach((row: any) => {
            if (!matrix[row.role_id]) matrix[row.role_id] = [];
            matrix[row.role_id].push(row.permission_id);
        });
        res.json(matrix);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching matrix' });
    }
});

// Update permission matrix
router.post('/permissions/matrix', authenticateToken, async (req, res) => {
    const { matrix } = req.body; // roleId -> permissionIds[]
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM auth_role_permissions');
        
        for (const roleId in matrix) {
            const permIds = matrix[roleId];
            for (const permId of permIds) {
                await connection.query('INSERT INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
            }
        }
        
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: 'Error updating matrix' });
    } finally {
        connection.release();
    }
});

export default router;
