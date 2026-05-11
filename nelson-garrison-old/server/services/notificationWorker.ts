import db from '../db.js';
import { Server } from 'socket.io';

export const startNotificationWorker = (io: Server) => {
  setInterval(async () => {
    try {
      const [notifications]: any = await db.query(
        `SELECT nq.queue_id, nq.recipient_user_id, nq.channel, nq.payload, sn.message, sn.notification_type 
         FROM notification_queue nq
         JOIN system_notifications sn ON nq.notification_id = sn.notification_id
         WHERE nq.status = 'QUEUED' AND (nq.retry_count < 3) LIMIT 10`
      );

      for (const n of notifications) {
        try {
          if (n.channel === 'IN_APP') {
            // Emitting to specific user's room if recipient_user_id is given
            if (n.recipient_user_id) {
               io.to(`user_${n.recipient_user_id}`).emit('notification', {
                 id: n.queue_id,
                 title: n.notification_type,
                 message: n.message,
                 type: 'info'
               });
            } else {
               // broadcast to role, etc if configured (for simplicity, broadcasting all if no recipient_user_id)
               io.emit('notification', {
                 id: n.queue_id,
                 title: n.notification_type,
                 message: n.message,
                 type: 'info'
               });
            }
          } else {
            // SMS / Email integration would go here
            console.log(`Sending ${n.channel} notification to user ${n.recipient_user_id}: ${n.notification_type}`);
          }

          await db.execute('UPDATE notification_queue SET status = ?, processed_at = NOW() WHERE queue_id = ?', ['COMPLETED', n.queue_id]);
        } catch (innerErr) {
          await db.execute('UPDATE notification_queue SET retry_count = retry_count + 1 WHERE queue_id = ?', [n.queue_id]);
        }
      }
    } catch (e) {
      console.error('Notification worker error:', e);
    }
  }, 5000); // Check every 5 seconds
};
