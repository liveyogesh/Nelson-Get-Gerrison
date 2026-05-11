import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { logAudit } from '../middleware/auth.js';
import { io } from '../index.js';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nelson_garrison_secret_key_2024';

router.post('/login', async (req: any, res: any) => {
  const { email, password } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const [rows]: any = await db.execute(`
      SELECT 
        u.id, 
        u.email, 
        u.password_hash, 
        u.is_active, 
        u.locked_until,
        u.failed_attempts,
        u.password_changed_at,
        u.username as name,
        r.role_code as role,
        emp.department_id,
        efa.facility_id as default_facility_id
      FROM auth_users u 
      LEFT JOIN auth_user_roles ur ON u.id = ur.user_id 
      LEFT JOIN auth_roles r ON ur.role_id = r.id 
      LEFT JOIN hr_employee_user_mapping m ON u.id = m.user_id
      LEFT JOIN hr_employees emp ON m.employee_id = emp.employee_id
      LEFT JOIN employee_facility_access efa ON emp.employee_id = efa.employee_id
      WHERE u.email = ? OR u.username = ?
    `, [email, email]);
    const user = rows[0];

    if (!user) {
      await logAudit(null, 'LOGIN_FAIL', 'AUTH', 'auth_users', null, null, { email, reason: 'User not found' }, req);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account deactivated' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await db.execute('INSERT INTO login_history (user_id, ip_address, user_agent, status, failure_reason) VALUES (?, ?, ?, ?, ?)', [user.id, ip, userAgent, 'LOCKED', 'Account temporarily locked due to failed attempts']);
      return res.status(403).json({ message: 'Account is temporarily locked due to too many failed attempts. Try again later.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      const newFailedAttempts = user.failed_attempts + 1;
      let lockQuery = 'UPDATE auth_users SET failed_attempts = ? WHERE id = ?';
      let lockParams: any[] = [newFailedAttempts, user.id];
      let failureReason = 'Wrong password';
      
      if (newFailedAttempts >= 5) {
        lockQuery = 'UPDATE auth_users SET failed_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?';
        failureReason = 'Account locked out after 5 failed attempts';
        
        io.emit('notification', {
          title: 'Security Alert: Intrusion Attempt',
          message: `Account ${user.email} locked after multiple failed login attempts from ${ip}.`,
          type: 'danger',
          role: ['SECURITY_GUARD', 'SUPER_ADMIN']
        });
      }

      await db.execute(lockQuery, lockParams);
      await db.execute('INSERT INTO login_history (user_id, ip_address, user_agent, status, failure_reason) VALUES (?, ?, ?, ?, ?)', [user.id, ip, userAgent, 'FAILED', failureReason]);
      await logAudit(user.id, 'LOGIN_FAIL', 'AUTH', 'auth_users', user.id, null, { email, reason: failureReason }, req);
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Success Authentication
    const [perms]: any = await db.query(`
      SELECT p.permission_key 
      FROM auth_user_roles ur
      JOIN auth_role_permissions rp ON ur.role_id = rp.role_id
      JOIN auth_permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ?
    `, [user.id]);
    const permissions = perms.map((p: any) => p.permission_key);

    const sessionId = crypto.randomUUID();
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, depId: user.department_id, facilityId: user.default_facility_id, sessionId, permissions },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Update last login & clear failures
    await db.execute('UPDATE auth_users SET failed_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    
    // Create active session
    await db.execute(
        'INSERT INTO active_sessions (session_id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 12 HOUR))',
        [sessionId, user.id, ip, userAgent]
    );
    
    // Log success history
    await db.execute('INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, ?)', [user.id, ip, userAgent, 'SUCCESS']);

    await logAudit(user.id, 'LOGIN_SUCCESS', 'AUTH', 'auth_users', user.id, null, {}, req);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.department_id,
        passwordChangedAt: user.password_changed_at,
        permissions
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: String(error) });
  }
});

router.post('/logout', async (req: any, res: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.json({ success: true });
  
  try {
     const decoded: any = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
     if (decoded && decoded.sessionId) {
       await db.execute('DELETE FROM active_sessions WHERE session_id = ?', [decoded.sessionId]);
     }
  } catch(e) {
     console.error('Logout decode error', e);
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
