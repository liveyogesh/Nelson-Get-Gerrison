import pool from '../db.js';

export const logAudit = async (params: {
    userId?: number | string;
    action: string;
    module?: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
}) => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, module, resource_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                params.userId || null,
                params.action,
                params.module || null,
                params.resourceId || null,
                params.oldValues ? JSON.stringify(params.oldValues) : null,
                params.newValues ? JSON.stringify(params.newValues) : null,
                params.ipAddress || null,
                params.userAgent || null
            ]
        );
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};
