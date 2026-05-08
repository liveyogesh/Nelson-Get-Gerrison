import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nelson_garrison_secret_key';

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    
    // Session Guard
    try {
        const [session]: any = await db.query('SELECT * FROM active_sessions WHERE session_token = ? AND expires_at > NOW()', [token]);
        if (session.length === 0) {
            return res.status(401).json({ message: 'Session expired or invalidated.' });
        }
    } catch (e) {
        return res.status(500).json({ message: 'Session validation error.' });
    }

    req.user = user;
    req.token = token;
    next();
  });
};

export const authorizePermissions = (...allowedPermissions: string[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    try {
      // 1. Check Primary Role Permissions
      const [perms]: any = await db.query(`
        SELECT p.permission_key 
        FROM auth_permissions p
        JOIN auth_role_permissions rp ON p.id = rp.permission_id
        JOIN auth_roles r ON rp.role_id = r.id
        WHERE r.role_code = ?
      `, [user.role]);

      let userPermissions = perms.map((p: any) => p.permission_key);

      // 2. Check Dynamic / Inherited Assignments (Acting HOD logic)
      const [dynamicAssignments]: any = await db.query(`
        SELECT assigned_role 
        FROM department_role_assignments 
        WHERE user_id = ? 
        AND status = 'ACTIVE' 
        AND (effective_to IS NULL OR effective_to > NOW())
      `, [user.id]);

      for (const assignment of dynamicAssignments) {
        if (assignment.assigned_role === 'Acting HOD' || assignment.assigned_role === 'HOD') {
          // Inherit HOD permissions
          const [hodPerms]: any = await db.query(`
            SELECT p.permission_key 
            FROM auth_permissions p
            JOIN auth_role_permissions rp ON p.id = rp.permission_id
            JOIN auth_roles r ON rp.role_id = r.id
            WHERE r.role_code = 'HOD'
          `);
          userPermissions = [...new Set([...userPermissions, ...hodPerms.map((p: any) => p.permission_key)])];
        }
      }

      const hasPermission = allowedPermissions.some(ap => userPermissions.includes(ap));
      if (!hasPermission && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Missing required permission.' });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ message: 'Internal server error during authorization.' });
    }
  };
};

export const shiftGuard = async (req: any, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user || (user.role !== 'SECURITY_GUARD' && user.role !== 'STAFF')) return next();

  try {
    // 1. Check for Active Override
    const [overrides]: any = await db.query(`
        SELECT extended_until 
        FROM shift_overrides 
        WHERE user_id = ? 
        AND extended_until > NOW()
        ORDER BY created_at DESC 
        LIMIT 1
    `, [user.id]);

    if (overrides.length > 0) return next();

    // 2. Check Standard Shift Assignments
    const [assignments]: any = await db.query(`
        SELECT sm.start_time, sm.end_time 
        FROM employee_shift_assignments esa
        JOIN shift_master sm ON esa.shift_id = sm.shift_id
        WHERE esa.user_id = ? 
        AND esa.effective_from <= CURRENT_DATE() 
        AND (esa.effective_to IS NULL OR esa.effective_to >= CURRENT_DATE())
    `, [user.id]);

    if (assignments.length === 0) return res.status(403).json({ message: 'No shift assignment found.' });

    const now = new Date();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    let isWithinShift = false;
    for (const shift of assignments) {
        const [sH, sM, sS] = shift.start_time.split(':').map(Number);
        const [eH, eM, eS] = shift.end_time.split(':').map(Number);
        
        // Allow 30 mins grace period (1800s)
        const startSecs = sH * 3600 + sM * 60 + sS - 1800;
        const endSecs = eH * 3600 + eM * 60 + eS + 1800;

        if (startSecs < endSecs) { // Day shift
            if (currentTime >= startSecs && currentTime <= endSecs) isWithinShift = true;
        } else { // Night shift (wraps around midnight)
            if (currentTime >= startSecs || currentTime <= endSecs) isWithinShift = true;
        }
    }

    if (!isWithinShift) {
       return res.status(403).json({ message: 'Access denied: Outside shift hours.' });
    }
    
    next();
  } catch (err) {
    next();
  }
};

export const facilityScopeGuard = async (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // Super Admin and Corporate Admin have global access
    if (user.role === 'SUPER_ADMIN' || user.role === 'CORPORATE_ADMIN' || user.scope === 'CORPORATE') {
        return next();
    }

    const requestedFacilityId = req.params.facilityId || req.body.facility_id || req.query.facility_id;
    if (!requestedFacilityId) return next();

    try {
        const [access]: any = await db.query(`
            SELECT id FROM employee_facility_access 
            WHERE user_id = ? AND facility_id = ?
        `, [user.id, requestedFacilityId]);

        if (access.length === 0) {
            return res.status(403).json({ 
                message: 'Scoped Access Denied: You are not authorized to access data for this facility.' 
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Scoping validation error.' });
    }
};

export const terminalIpGuard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const [settings]: any = await db.query('SELECT setting_value FROM system_settings WHERE setting_key = "Authorized_Gate_IPs"');
    const allowedIps = settings[0]?.setting_value.split(',').map((ip: string) => ip.trim());
    
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    if (allowedIps && !allowedIps.includes(clientIp)) {
      console.warn(`Unauthorized terminal access attempt from IP: ${clientIp}`);
      return res.status(403).json({ message: 'Restricted Terminal: Access denied from unauthorized network.' });
    }
    
    next();
  } catch (err) {
    next();
  }
};

export const getScopingFilter = async (user: any) => {
    // If corporate, see everything
    if (user.role === 'SUPER_ADMIN' || user.role === 'CORPORATE_ADMIN' || user.scope === 'CORPORATE') {
        return '';
    }

    if (user.scope === 'FACILITY' && user.scope_id) {
        return ` AND facility_id = ${db.escape(user.scope_id)} `;
    }

    if (user.scope === 'DEPARTMENT' && user.scope_id) {
        return ` AND department_id = ${db.escape(user.scope_id)} `;
    }

    // Fallback: If no scope is defined correctly, fall back to employee_facility_access
    const [rows]: any = await db.query('SELECT facility_id FROM employee_facility_access WHERE user_id = ?', [user.id]);
    const facilityIds = rows.map((r: any) => r.facility_id);
    if (facilityIds.length === 0) return ' AND 1=0 '; // Access nothing
    return ` AND facility_id IN (${facilityIds.join(',')}) `;
};
