import jwt from 'jsonwebtoken';
import db from '../db.js';
const JWT_SECRET = process.env.JWT_SECRET || 'nelson_garrison_secret_key_2024';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ message: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const userRole = req.user.role;
        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
        }
        next();
    };
};
export const logAudit = async (action_by_user_id, action_type, module_name, entity_name, entity_id, old_value_json, new_value_json, req) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const device_info = req.headers['user-agent'] || 'unknown';
        await db.execute('INSERT INTO audit_logs (action_by_user_id, action_type, module_name, entity_name, entity_id, old_value_json, new_value_json, IP_address, device_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [action_by_user_id, action_type, module_name, entity_name, entity_id, JSON.stringify(old_value_json), JSON.stringify(new_value_json), String(ip), device_info]);
    }
    catch (error) {
        console.error('Audit Logging Error:', error);
    }
};
export const auditMiddleware = (moduleName, entityName) => {
    return async (req, res, next) => {
        // We capture the original send and json functions to intercept the response
        const originalJson = res.json;
        const originalSend = res.send;
        let responseData;
        res.json = function (body) {
            responseData = body;
            return originalJson.call(this, body);
        };
        res.send = function (body) {
            if (!responseData)
                responseData = body;
            return originalSend.call(this, body);
        };
        res.on('finish', () => {
            // Only log on successful creation/updates
            if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                const userId = req.user?.id || null;
                let actionType = 'CREATE';
                if (req.method === 'PUT' || req.method === 'PATCH')
                    actionType = 'UPDATE';
                if (req.method === 'DELETE')
                    actionType = 'DELETE';
                let entityId = null;
                if (responseData && responseData.id)
                    entityId = responseData.id;
                else if (req.params.id)
                    entityId = parseInt(req.params.id);
                const newJson = req.method !== 'DELETE' ? req.body : null;
                // In a real sophisticated system, we might fetch oldJson before update. 
                // For here, we capture what we can
                logAudit(userId, actionType, moduleName, entityName, entityId, null, newJson, req);
            }
        });
        next();
    };
};
