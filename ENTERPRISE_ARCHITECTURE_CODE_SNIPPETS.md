# Updated Code Snippets

As requested, here are the core pieces of logic that have been implemented into the "Nelson Garrison" application based on the modern enterprise-grade architecture.

### 1. Node.js Movement State Machine (Controller Logic)

**Location: `/server/routes/gatepass.ts` (Movement Endpoint)**

```typescript
router.post('/:id/movement', authorizePermissions('PROCESS_GATEPASS_MOVEMENT'), async (req: any, res: any) => {
  try {
    const { movementType, securityGuardId } = req.body;
    const userId = req.user?.id || securityGuardId || 1;
    const requestId = req.params.id;

    // Fetch current request details
    const [requestData]: any = await db.query(
      'SELECT current_status, expected_return_time, requested_exit_time FROM gatepass_requests WHERE request_id = ?',
      [requestId]
    );

    if (!requestData || requestData.length === 0) {
      return res.status(404).json({ error: 'Gatepass not found' });
    }

    const { current_status, expected_return_time } = requestData[0];
    const now = new Date();
    const expectedReturn = expected_return_time ? new Date(expected_return_time) : null;

    if (movementType === 'EXIT') {
      if (current_status !== 'APPROVED') {
        return res.status(400).json({ error: 'Pass is not APPROVED or has already been used' });
      }
      
      // PRE-USE: Safety-Net - if currently past expected return time
      if (expectedReturn && now > expectedReturn) {
        await db.execute('UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?', ['VOID', requestId]);
        await logAudit(userId, 'GATEPASS_MOVEMENT', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, { current_status }, { current_status: 'VOID', note: 'Safety-Net Voided' }, req);
        return res.status(400).json({ error: 'Pass has expired before use and has been VOIDED.' });
      }

      await db.execute(
        'INSERT INTO gatepass_movements (request_id, exit_time, security_guard_id) VALUES (?, NOW(), ?)',
        [requestId, userId]
      );
      
      await db.execute('UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?', ['OUT', requestId]);
      await logAudit(userId, 'GATEPASS_MOVEMENT', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, { current_status }, { current_status: 'OUT', movementType: 'EXIT' }, req);
      return res.json({ success: true, message: 'Check-Out successful.' });

    } else if (movementType === 'ENTRY') {
      if (current_status !== 'OUT') {
        return res.status(400).json({ error: 'Cannot Check-In. Staff is not checked out on this pass.' });
      }

      // RE-ENTRY: allowed regardless of time.
      let late_return = false;
      if (expectedReturn) {
         let graceMins = 0;
         try {
            const [settings]: any = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'grace_period_mins'");
            if (settings.length > 0 && settings[0].setting_value) {
                const parsed = parseInt(settings[0].setting_value, 10);
                if (!isNaN(parsed) && parsed > 0) graceMins = parsed;
            }
         } catch (e) { console.error("Could not fetch grace_period_mins", e); }
         
         const threshold = new Date(expectedReturn.getTime() + graceMins * 60 * 1000);
         if (now > threshold) {
            late_return = true;
         }
      }

      // Update the latest movement record
      await db.execute(
        'UPDATE gatepass_movements SET entry_time = NOW(), late_return = ? WHERE request_id = ? AND entry_time IS NULL ORDER BY movement_id DESC LIMIT 1',
        [late_return, requestId]
      );

      // Log Violation if late
      if (late_return) {
         const [lastMovement]: any = await db.query('SELECT movement_id FROM gatepass_movements WHERE request_id = ? ORDER BY movement_id DESC LIMIT 1', [requestId]);
         if(lastMovement && lastMovement.length > 0) {
           await db.execute(
             'INSERT INTO gatepass_violations (request_id, movement_id, violation_type, severity, description) VALUES (?, ?, ?, ?, ?)',
             [requestId, lastMovement[0].movement_id, 'LATE_RETURN', 'MEDIUM', 'Employee returned after expected time.']
           );
         }
      }

      await db.execute('UPDATE gatepass_requests SET current_status = ? WHERE request_id = ?', ['RETURNED', requestId]);
      await logAudit(userId, 'GATEPASS_MOVEMENT', 'GATEPASS_SERVICE', 'gatepass_requests', requestId, { current_status }, { current_status: 'RETURNED', movementType: 'ENTRY' }, req);
      return res.json({ success: true, message: 'Check-In successful.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

### 2. Escalation Background Service (Watcher)

**Location: `/server/services/escalationWatcher.ts`**

```typescript
import cron from 'node-cron';
import db from '../db.js';
import { logAudit } from '../middleware/auth.js';
import { Server } from 'socket.io';

export const startEscalationWatcher = (io: Server) => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[Escalation Watcher] Checking for pending gatepass requests...');
      
      let timeoutMins = 15;
      try {
        const [settings]: any = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'escalation_timeout_mins'");
        if (settings.length > 0 && settings[0].setting_value) {
            const parsed = parseInt(settings[0].setting_value, 10);
            if (!isNaN(parsed) && parsed > 0) timeoutMins = parsed;
        }
      } catch (e) { console.error("Could not fetch escalation_timeout_mins", e); }
      
      const thresholdTime = new Date(Date.now() - timeoutMins * 60 * 1000);
      
      const [pendingRequests]: any = await db.query(
        `SELECT request_id, employee_id, current_status, created_at
         FROM gatepass_requests
         WHERE current_status = 'PENDING' 
         AND is_priority = FALSE 
         AND created_at < ?`,
        [thresholdTime]
      );

      if (pendingRequests.length === 0) return;

      for (const req of pendingRequests) {
        // Auto-bypass HOD to HR
        await db.execute(
          `UPDATE gatepass_requests SET current_status = 'ESCALATED_TO_HR' WHERE request_id = ?`,
          [req.request_id]
        );

        await db.execute(
          `INSERT INTO gatepass_approvals (request_id, approval_level, status, approver_id, action, remarks)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.request_id, 1, 'AUTO_ESCALATED', null, 'System_Bypass_Escalation', 'System Auto-Escalation due to timeout']
        );

        io.emit('notification', {
          title: 'Gatepass Auto-Escalation',
          message: `Request #${req.request_id} automatically escalated to HR.`,
          type: 'warning',
          role: ['HR']
        });
      }
    } catch (e) {
      console.error('[Escalation Watcher] Error:', e);
    }
  });
};
```

### 3. Enhanced Security Dashboard React UI

**Location: `/src/components/SecurityDashboard.tsx`**

```tsx
import React, { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { Search, UserCircle, QrCode } from 'lucide-react';
import axios from 'axios';

export default function SecurityDashboard() {
  const { user } = useAuthStore();
  const [passNumber, setPassNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [searchMode, setSearchMode] = useState<'qr' | 'manual'>('qr');
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setScanResult(null);

    try {
      const url = searchMode === 'qr' 
        ? `/api/gatepass/lookup?qr=\${encodeURIComponent(passNumber)}`
        : `/api/gatepass/lookup?empId=\${encodeURIComponent(employeeId)}`;
      
      const { data } = await axios.get(url);
      setScanResult(data);
    } catch (e: any) {
      setScanResult({ error: e.response?.data?.error || 'Pass not found or invalid' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkMovement = async (movementType: 'EXIT' | 'ENTRY') => {
    try {
      await axios.post(`/api/gatepass/\${scanResult.id}/movement`, { movementType, securityGuardId: user?.id });
      alert(`Marked \${movementType} for \${scanResult.employeeName}`);
      setPassNumber('');
      setEmployeeId('');
      setScanResult(null);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to mark movement');
    }
  };

  // UI Renders omitted for brevity - contains seamless Scanner UI
```
