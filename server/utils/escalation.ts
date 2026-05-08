import pool from '../db.js';

export const processEscalations = async () => {
    const connection = await pool.getConnection();
    try {
        console.log("Checking for gatepass escalations...");
        
        // Find requests pending for more than 15 minutes
        const [staleRequests]: any = await connection.query(`
            SELECT id FROM gatepass_requests 
            WHERE status = 'PENDING' 
            AND requested_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        `);

        for (const req of staleRequests) {
            await connection.beginTransaction();
            
            // Update status
            await connection.query(
                "UPDATE gatepass_requests SET status = 'System_Auto_Escalated' WHERE id = ?",
                [req.id]
            );

            // Audit log or Notification to HR
            const [hrUsers]: any = await connection.query(
                "SELECT id FROM auth_users WHERE role = 'HR_MANAGER'"
            );

            for (const hr of hrUsers) {
                await connection.query(
                    "INSERT INTO system_notifications (user_id, message, type) VALUES (?, ?, ?)",
                    [hr.id, `AUTO ESCALATED REQUEST: ${req.id} (Timeout)`, 'ESCALATION']
                );
            }

            await connection.commit();
            console.log(`Request ${req.id} escalated.`);
        }
    } catch (err) {
        console.error("Escalation error:", err);
    } finally {
        connection.release();
    }
};
