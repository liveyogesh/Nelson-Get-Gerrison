import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nelson_garrison_secret_key_2024';

export const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    
    if (user.sessionId) {
      try {
        const [sessionRows]: any = await db.query('SELECT * FROM active_sessions WHERE session_id = ? AND expires_at > NOW()', [user.sessionId]);
        if (sessionRows.length === 0) {
           return res.status(401).json({ message: 'Session expired or revoked.' });
        }
      } catch (dbErr) {
        return res.status(500).json({ message: 'Database error while checking session.' });
      }
    }
    
    req.user = user;
    next();
  });
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
    }
    next();
  };
};

export const authorizePermissions = (...permissions: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const userPerms = req.user.permissions || [];
    
    // Admin has a bypass
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const hasPermission = permissions.some(p => userPerms.includes(p));
    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden: Missing required permission.' });
    }
    next();
  };
};

export const scopeFacility = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  if (req.user.role === 'SUPER_ADMIN') {
    // Has access to all
    req.facilities = []; 
    req.isCorporate = true;
    return next();
  }

  try {
    const [accessRows]: any = await db.query(
      `SELECT efa.facility_id 
       FROM hr_employee_user_mapping m
       JOIN hr_employees e ON m.employee_id = e.employee_id
       JOIN employee_facility_access efa ON e.employee_id = efa.employee_id
       WHERE m.user_id = ? 
         AND efa.active_status = TRUE 
         AND (efa.valid_until IS NULL OR efa.valid_until >= NOW())`,
      [req.user.id]
    );
    
    req.facilities = accessRows.map((r: any) => r.facility_id);
    req.isCorporate = false;
    
    if (req.facilities.length === 0) {
      return res.status(403).json({ message: 'Forbidden: No facility access mapped or expired.' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Database error while checking facility access.' });
  }
};

export const checkActiveShift = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'HR_ADMIN') {
    return next();
  }

  // Mostly applicable to guards and supervisors
  if (req.user.role === 'SECURITY_GUARD' || req.user.role === 'SECURITY_SUPERVISOR' || req.user.role === 'SECURITY_HOD') {
    try {
      const [shiftRows]: any = await db.query(
        `SELECT a.* FROM employee_shift_assignments a
         JOIN hr_employee_user_mapping m ON a.employee_id = m.employee_id
         JOIN shift_master s ON a.shift_id = s.shift_id
         WHERE m.user_id = ? 
         AND a.active_status = TRUE
         AND (a.effective_from IS NULL OR a.effective_from <= CURDATE())
         AND (a.effective_to IS NULL OR a.effective_to >= CURDATE())
         AND CURTIME() BETWEEN s.start_time AND s.end_time`,
        [req.user.id]
      );
      
      if (shiftRows.length === 0) {
        // Find if there is an active delegation or override allowed
        const [overrideRows]: any = await db.query(
          `SELECT * FROM employee_shift_assignments a
           JOIN hr_employee_user_mapping m ON a.employee_id = m.employee_id
           WHERE m.user_id = ? AND a.overrides_allowed = TRUE`, [req.user.id]
        );
        if (overrideRows.length === 0) {
          return res.status(403).json({ message: 'Forbidden: No active shift.' });
        }
      }
    } catch (dbErr) {
      return res.status(500).json({ message: 'Error checking shift details.' });
    }
  }
  next();
};

export const logAudit = async (action_by_user_id: number | null, action_type: string, module_name: string, entity_name: string | null, entity_id: number | null, old_value_json: any, new_value_json: any, req: Request) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const device_info = req.headers['user-agent'] || 'unknown';
    await db.execute(
        'INSERT INTO audit_logs (action_by_user_id, action_type, module_name, entity_name, entity_id, old_value_json, new_value_json, IP_address, device_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [action_by_user_id, action_type, module_name, entity_name, entity_id, JSON.stringify(old_value_json), JSON.stringify(new_value_json), String(ip), device_info]
    );
  } catch (error) {
    console.error('Audit Logging Error:', error);
  }
};

export const auditMiddleware = (moduleName: string, entityName: string, idField: string = 'id') => {
  return async (req: any, res: Response, next: NextFunction) => {
    let oldData: any = null;
    const entityIdParam = req.params.id || null;

    if (entityIdParam && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      try {
        // Attempt to fetch old data before the operation
        const [rows]: any = await db.query(`SELECT * FROM ${entityName} WHERE ${idField} = ?`, [entityIdParam]);
        if (rows && rows.length > 0) {
          oldData = rows[0];
        }
      } catch (err) {
        console.warn('Could not fetch old data for audit log:', err);
      }
    }

    // We capture the original send and json functions to intercept the response
    const originalJson = res.json;
    const originalSend = res.send;

    let responseData: any;

    res.json = function (body) {
      responseData = body;
      return originalJson.call(this, body);
    };

    res.send = function (body) {
      if (!responseData) responseData = body;
      return originalSend.call(this, body);
    };

    res.on('finish', () => {
      // Only log on successful creation/updates
      if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const userId = req.user?.id || null;
        let actionType = 'CREATE';
        if (req.method === 'PUT' || req.method === 'PATCH') actionType = 'UPDATE';
        if (req.method === 'DELETE') actionType = 'DELETE';

        let entityId = entityIdParam ? parseInt(entityIdParam) : null;
        if (responseData && responseData.id) entityId = responseData.id;

        const newJson = req.method !== 'DELETE' ? req.body : null;
        
        logAudit(userId, actionType, moduleName, entityName, entityId, oldData, newJson, req);
      }
    });

    next();
  };
};
