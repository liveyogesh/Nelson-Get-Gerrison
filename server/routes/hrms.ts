import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, authorizePermissions } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Format and normalize employee code
const normalizeCode = (code: string) => {
    if (!code) return code;
    // trim leading/trailing spaces, convert to uppercase, remove invalid special characters (keep only alphanumeric and dashes)
    let n = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // Example padding rule: if it starts with 'C-' and followed by number, or just 'E', pad it to fixed length. Here we just return the cleaned up string but we can pad it if it matches a pattern.
    // e.g., 'E132' -> 'E0132' if we want fixed 4 digit number.
    const match = n.match(/^([A-Z-]*?)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const paddedNum = numStr.padStart(4, '0');
        return `${prefix}${paddedNum}`;
    }
    return n;
};

// Log employee change
const logEmployeeChange = async (employeeId: number, changeType: string, oldValue: string, newValue: string, changedBy: number, reason: string = '') => {
    if (oldValue === newValue) return;
    await db.execute(
        'INSERT INTO employee_change_history (employee_id, change_type, old_value, new_value, changed_by, reason) VALUES (?, ?, ?, ?, ?, ?)',
        [employeeId, changeType, oldValue, newValue, changedBy, reason]
    );
};

// Active employees for reporting manager selection
router.get('/employees/active', async (req: any, res: any) => {
    try {
        const [employees]: any = await db.query(
            "SELECT employee_id, employee_code, first_name, last_name FROM hr_employees WHERE employment_status = 'ACTIVE' ORDER BY first_name ASC"
        );
        res.json(employees);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Create employee
router.post('/employees', authorizePermissions('HR_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    try {
        const { employee_code, first_name, last_name, email, mobile, department_id, designation_id, reporting_manager_id, employee_type_id, photo_url } = req.body;
        
        const normCode = normalizeCode(employee_code);

        // Check if normalized code exists
        const [existing]: any = await db.query('SELECT employee_id FROM hr_employees WHERE employee_code_normalized = ? OR employee_code = ?', [normCode, employee_code]);
        if (existing.length > 0) return res.status(400).json({ error: 'Employee with this code already exists.' });

        // Insert
        const [result]: any = await db.execute(
            `INSERT INTO hr_employees 
             (employee_code, employee_code_normalized, first_name, last_name, email, mobile, department_id, designation_id, reporting_manager_id, employee_type_id, employment_status, photo_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
            [employee_code, normCode, first_name, last_name, email, mobile, department_id || null, designation_id || null, reporting_manager_id || null, employee_type_id || null, photo_url || null]
        );
        res.json({ success: true, employee_id: result.insertId, employee_code_normalized: normCode });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Update employee
router.put('/employees/:id', authorizePermissions('HR_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { department_id, designation_id, reporting_manager_id, employment_status, employee_type_id, photo_url, reason } = req.body;

        if (reporting_manager_id && parseInt(reporting_manager_id) === employeeId) {
            return res.status(400).json({ error: 'Employee cannot report to themselves.' });
        }

        if (employment_status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(employment_status)) {
            return res.status(400).json({ error: 'Invalid employment status.' });
        }

        const [existingRows]: any = await db.query('SELECT * FROM hr_employees WHERE employee_id = ?', [employeeId]);
        if (existingRows.length === 0) return res.status(404).json({ error: 'Employee not found.' });
        const existing = existingRows[0];

        // Track changes
        const changedBy = req.user.id;
        if (department_id !== undefined) await logEmployeeChange(employeeId, 'DEPARTMENT', String(existing.department_id), String(department_id), changedBy, reason);
        if (designation_id !== undefined) await logEmployeeChange(employeeId, 'DESIGNATION', String(existing.designation_id), String(designation_id), changedBy, reason);
        if (reporting_manager_id !== undefined) await logEmployeeChange(employeeId, 'REPORTING_MANAGER', String(existing.reporting_manager_id), String(reporting_manager_id), changedBy, reason);
        if (employment_status !== undefined) await logEmployeeChange(employeeId, 'EMPLOYMENT_STATUS', String(existing.employment_status), String(employment_status), changedBy, reason);

        // Update
        await db.execute(
            `UPDATE hr_employees SET 
             department_id = COALESCE(?, department_id),
             designation_id = COALESCE(?, designation_id),
             reporting_manager_id = COALESCE(?, reporting_manager_id),
             employment_status = COALESCE(?, employment_status),
             employee_type_id = COALESCE(?, employee_type_id),
             photo_url = COALESCE(?, photo_url)
             WHERE employee_id = ?`,
            [department_id, designation_id, reporting_manager_id, employment_status, employee_type_id, photo_url, employeeId]
        );

        res.json({ success: true, message: 'Employee updated successfully.' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/history/:employeeId', async (req: any, res: any) => {
    try {
        const [history]: any = await db.query(
            "SELECT h.*, u.username as changed_by_name FROM employee_change_history h LEFT JOIN auth_users u ON h.changed_by = u.id WHERE h.employee_id = ? ORDER BY h.changed_at DESC",
            [req.params.employeeId]
        );
        res.json(history);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Enterprise Master Routes
router.get('/masters/:type', async (req: any, res: any) => {
    try {
        const type = req.params.type;
        const validMasters = ['organization_master', 'state_master', 'location_master', 'facility_master', 'pass_type_master', 'employee_type_master', 'designation_master'];
        if (!validMasters.includes(type)) return res.status(400).json({ error: 'Invalid master type' });
        
        const [data]: any = await db.query(`SELECT * FROM ${type} ORDER BY 1 DESC`);
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Active sessions lookup
router.get('/sessions', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
    try {
        const [sessions]: any = await db.query(`
            SELECT s.*, u.username, u.email
            FROM active_sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.expires_at > NOW() AND s.is_revoked = FALSE
            ORDER BY s.last_activity_at DESC
        `);
        res.json(sessions);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/sessions/:id/revoke', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
    try {
        const sessionId = req.params.id;
        await db.execute('UPDATE active_sessions SET is_revoked = TRUE, forced_logout_flag = TRUE, revoked_by = ?, revoked_at = NOW() WHERE session_id = ?', [req.user.id, sessionId]);
        // Ideally emit a socket event here to force client logout based on session_id
        res.json({ success: true, message: 'Session revoked and forced logout triggered.' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;

