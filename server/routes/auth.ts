import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { logAudit } from '../utils/audit.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nelson_garrison_secret_key';

router.post('/login', async (req, res) => {
  const { username, password, totpToken, deviceFingerprint } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    const [users]: any = await pool.query('SELECT * FROM auth_users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      await pool.query('INSERT INTO login_history (username, status, ip_address, user_agent) VALUES (?, ?, ?, ?)', [username, 'FAILED', ipAddress, userAgent]);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Status Check
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: `Account is ${user.status}. Please contact HR.` });
    }

    // Lock Check
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ message: 'Account is temporarily locked due to multiple failed attempts.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      const newFailedAttempts = user.failed_attempts + 1;
      let lockedUntil = null;
      if (newFailedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 mins
      }
      
      await pool.query('UPDATE auth_users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [newFailedAttempts, lockedUntil, user.id]);
      await pool.query('INSERT INTO login_history (user_id, username, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)', [user.id, username, 'FAILED', ipAddress, userAgent]);
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check 2FA
    if (user.two_factor_enabled) {
        if (!totpToken) {
            return res.status(401).json({ requires2FA: true, message: '2FA token required' });
        }
        
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: totpToken,
            window: 1 // allow 1 window tolerance
        });

        if (!verified) {
            return res.status(401).json({ message: 'Invalid 2FA token' });
        }
    }

    // Success
    await pool.query('UPDATE auth_users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, scope: user.user_scope },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Track Session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query('INSERT INTO active_sessions (user_id, session_token, ip_address, device_fingerprint, expires_at) VALUES (?, ?, ?, ?, ?)', [user.id, token, ipAddress, deviceFingerprint, expiresAt]);
    
    // Audit & History
    await pool.query('INSERT INTO login_history (user_id, username, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)', [user.id, username, 'SUCCESS', ipAddress, userAgent]);
    await logAudit({ userId: user.id, action: 'LOGIN', module: 'AUTH', ipAddress, userAgent });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        scope: user.user_scope,
        firstLogin: !user.first_login_completed
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/change-password', authenticateToken, async (req: any, res) => {
    const { newPassword, totpToken } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const [users]: any = await pool.query('SELECT two_factor_enabled, two_factor_secret FROM auth_users WHERE id = ?', [userId]);
        const user = users[0];

        // Ensure secondary verification if enabled
        if (user.two_factor_enabled) {
             if (!totpToken) return res.status(400).json({ requires2FA: true, message: '2FA token required for sensitive action' });
             const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: totpToken,
                window: 1
            });
            if (!verified) return res.status(401).json({ message: 'Invalid 2FA token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE auth_users SET password = ?, password_changed_at = NOW(), first_login_completed = TRUE WHERE id = ?', [hashedPassword, userId]);
        await logAudit({ userId, action: 'PASSWORD_CHANGE', module: 'AUTH' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/2fa/setup', authenticateToken, async (req: any, res) => {
    try {
        const secret = speakeasy.generateSecret({ name: `NelsonGarrison (${req.user.username})` });
        
        await pool.query('UPDATE auth_users SET two_factor_secret = ? WHERE id = ?', [secret.base32, req.user.id]);
        
        // Generate QR code
        qrcode.toDataURL(secret.otpauth_url || '', (err, data_url) => {
            if (err) throw err;
            res.json({ secret: secret.base32, qrCodeUrl: data_url });
        });
    } catch (err) {
        res.status(500).json({ message: 'Error generating 2FA' });
    }
});

router.post('/2fa/verify', authenticateToken, async (req: any, res) => {
    const { token } = req.body;
    try {
        const [users]: any = await pool.query('SELECT two_factor_secret FROM auth_users WHERE id = ?', [req.user.id]);
        if (!users.length || !users[0].two_factor_secret) return res.status(400).json({ message: '2FA not setup' });

        const verified = speakeasy.totp.verify({
            secret: users[0].two_factor_secret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (verified) {
            await pool.query('UPDATE auth_users SET two_factor_enabled = TRUE WHERE id = ?', [req.user.id]);
            await logAudit({ userId: req.user.id, action: '2FA_ENABLED', module: 'AUTH' });
            res.json({ success: true, message: '2FA Enabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid token' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error verifying 2FA' });
    }
});

export default router;
