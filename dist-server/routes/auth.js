import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { logAudit } from '../middleware/auth.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nelson_garrison_secret_key_2024';
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute(`
      SELECT 
        u.id, 
        u.email, 
        u.password_hash, 
        u.is_active, 
        u.username as name,
        r.role_code as role,
        emp.department_id,
        efa.facility_id as default_facility_id
      FROM auth_users u 
      LEFT JOIN auth_user_roles ur ON u.id = ur.user_id 
      LEFT JOIN auth_roles r ON ur.role_id = r.id 
      LEFT JOIN hr_employee_user_mapping m ON u.id = m.user_id
      LEFT JOIN hr_employees emp ON m.employee_id = emp.employee_id
      LEFT JOIN employee_facility_access efa ON emp.employee_id = efa.employee_id AND efa.default_facility = TRUE
      WHERE u.email = ?
    `, [email]);
        const user = rows[0];
        if (!user) {
            await logAudit(null, 'LOGIN_FAIL', 'AUTH', 'auth_users', null, null, { email, reason: 'User not found' }, req);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.is_active) {
            return res.status(403).json({ message: 'Account deactivated' });
        }
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            await logAudit(user.id, 'LOGIN_FAIL', 'AUTH', 'auth_users', user.id, null, { email, reason: 'Wrong password' }, req);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, name: user.name, role: user.role, depId: user.department_id }, JWT_SECRET, { expiresIn: '12h' });
        // Update last login
        await db.execute('UPDATE auth_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        await logAudit(user.id, 'LOGIN_SUCCESS', 'AUTH', 'auth_users', user.id, null, {}, req);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                departmentId: user.department_id
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: String(error) });
    }
});
export default router;
