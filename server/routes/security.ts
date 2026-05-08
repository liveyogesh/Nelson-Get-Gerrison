import express from 'express';
import pool from '../db.js';
import { authenticateToken, authorizePermissions, facilityScopeGuard, getScopingFilter } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { getFacilityPolicy } from './enterprise.js';

const router = express.Router();

// Get Restricted Zones
router.get('/restricted/zones', authenticateToken, authorizePermissions('facility.zones.view'), async (req: any, res) => {
    try {
        const filter = await getScopingFilter(req.user);
        const [rows] = await pool.query(`SELECT * FROM restricted_zones WHERE 1=1 ${filter}`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching zones' });
    }
});

// Request Access to Restricted Zone
router.post('/restricted/request', authenticateToken, async (req: any, res) => {
    const { zoneId, reason } = req.body;
    try {
        await pool.query(
            'INSERT INTO restricted_zone_access_requests (user_id, zone_id, reason) VALUES (?, ?, ?)',
            [req.user.id, zoneId, reason]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error submitting request' });
    }
});

// Get Pending Approvals (for HOD or SECHOD)
router.get('/restricted/pending', authenticateToken, async (req: any, res) => {
    const { role } = req.user;
    try {
        const filter = await getScopingFilter(req.user);
        let query = `
            SELECT r.*, u.username, z.zone_name 
            FROM restricted_zone_access_requests r
            JOIN auth_users u ON r.user_id = u.id
            JOIN restricted_zones z ON r.zone_id = z.zone_id
            WHERE r.status = 'PENDING' ${filter.replace('facility_id', 'z.facility_id')}
        `;
        
        if (role === 'HOD') {
            query += ' AND r.hod_approval = FALSE';
        } else if (role === 'SECHOD') {
            query += ' AND r.hod_approval = TRUE AND r.sechod_approval = FALSE';
        } else if (role !== 'SUPER_ADMIN' && role !== 'CORPORATE_ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching pending requests' });
    }
} );

// Approve Access Request
router.post('/restricted/approve', authenticateToken, async (req: any, res) => {
    const { requestId } = req.body;
    const { role } = req.user;
    
    try {
        if (role === 'HOD') {
            await pool.query('UPDATE restricted_zone_access_requests SET hod_approval = TRUE WHERE id = ?', [requestId]);
        } else if (role === 'SECHOD') {
            await pool.query('UPDATE restricted_zone_access_requests SET sechod_approval = TRUE, status = "APPROVED" WHERE id = ?', [requestId]);
        } else {
            return res.status(403).json({ message: 'Only HOD or SECHOD can approve' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error approving request' });
    }
});

// Security Incidents
router.get('/incidents', authenticateToken, authorizePermissions('security.incidents.view'), async (req: any, res) => {
    try {
        const filter = await getScopingFilter(req.user);
        const [rows] = await pool.query(`
            SELECT i.*, u.username as reported_by_name, f.facility_name, p.first_name as involved_first, p.last_name as involved_last
            FROM security_incidents i 
            JOIN auth_users u ON i.reported_by = u.id 
            JOIN org_facilities f ON i.facility_id = f.facility_id
            LEFT JOIN auth_users p ON i.involved_person_id = p.id
            WHERE 1=1 ${filter.replace('facility_id', 'i.facility_id')}
            ORDER BY i.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching incidents' });
    }
});

router.post('/incidents', authenticateToken, authorizePermissions('security.incidents.manage'), async (req: any, res) => {
    const { incidentType, severity, involvedPerson, involved_person_id, location, description, facilityId, incident_status } = req.body;

    try {
        // If facilityId not provided, get from user assignment
        let targetFacilityId = facilityId;
        if (!targetFacilityId) {
            const [access]: any = await pool.query('SELECT facility_id FROM employee_facility_access WHERE user_id = ? LIMIT 1', [req.user.id]);
            targetFacilityId = access[0]?.facility_id;
        }

        if (!targetFacilityId) return res.status(400).json({ message: 'Facility ID required' });

        await pool.query(
            `INSERT INTO security_incidents 
             (facility_id, incident_type, severity, involved_person, involved_person_id, location, description, reported_by, incident_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [targetFacilityId, incidentType, severity, involvedPerson, involved_person_id || null, location || null, description, req.user.id, incident_status || 'OPEN']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error logging incident' });
    }
});

// Override Authorization (SECHOD only)
router.post('/override/force-checkin', authenticateToken, async (req: any, res) => {
    // ... logic same ...
});

// Gate Operations
router.get('/gates', authenticateToken, async (req: any, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM gate_master');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching gates' });
    }
});

router.post('/gates/traffic', authenticateToken, async (req: any, res) => {
    const { gateId, movementType, userId: targetUserId } = req.body;
    try {
        // 1. Get gate details and facility
        const [gateRows]: any = await pool.query('SELECT facility_id, gate_name FROM gate_master WHERE gate_id = ?', [gateId]);
        if (!gateRows.length) return res.status(404).json({ message: 'Gate not found' });
        
        const facilityId = gateRows[0].facility_id;

        // 2. Policy Check: Gate Timing (e.g., "22:00-05:00" restricted)
        const timingPolicy = await getFacilityPolicy(facilityId, 'GATE_TIMING_RESTR');
        if (timingPolicy) {
            const now = new Date();
            const currentTime = now.getHours() * 100 + now.getMinutes();
            const [start, end] = timingPolicy.split('-').map((t: string) => parseInt(t.replace(':', '')));
            
            // If current time is within restricted window (simple check)
            if (currentTime >= start || currentTime <= end) {
                // In a real system, we'd check against a 'BYPASS' list or specific roles
                if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'CORPORATE_ADMIN') {
                    return res.status(403).json({ 
                        message: `Access Restricted: Facility gate is closed during ${timingPolicy} per policy.` 
                    });
                }
            }
        }

        // 3. Log traffic
        await pool.query(
            'INSERT INTO gate_traffic (gate_id, movement_type, user_id) VALUES (?, ?, ?)', 
            [gateId, movementType, targetUserId || req.user.id]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error logging traffic' });
    }
});

router.get('/gates/traffic/recent', authenticateToken, async (req: any, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, g.gate_name 
            FROM gate_traffic t 
            JOIN gate_master g ON t.gate_id = g.gate_id 
            ORDER BY t.timestamp DESC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching traffic' });
    }
});

router.get('/guards/active', authenticateToken, async (req: any, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.username, s.shift_name, e.first_name, e.last_name
            FROM auth_users u
            JOIN hr_employee_user_mapping m ON u.id = m.user_id
            JOIN hr_employees e ON m.employee_id = e.employee_id
            JOIN employee_shift_assignments a ON u.id = a.user_id
            JOIN shift_master s ON a.shift_id = s.shift_id
            WHERE u.role = 'SECURITY_GUARD'
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching guards' });
    }
});

router.post('/gates/lockdown', authenticateToken, authorizePermissions('security.gates.manage'), async (req: any, res) => {
    const { gateId, status, reason } = req.body;

    try {
        await pool.query('UPDATE gate_master SET status = ? WHERE gate_id = ?', [status, gateId]);
        await logAudit({
            userId: req.user.id,
            action: status === 'LOCKDOWN' ? 'GATE_LOCKDOWN_ACTIVATE' : 'GATE_LOCKDOWN_RELEASE',
            module: 'SECURITY',
            resourceId: gateId,
            newValues: { reason }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Lockdown operation failed' });
    }
});

router.get('/analytics/summary', authenticateToken, authorizePermissions('security.dashboard.view'), async (req: any, res) => {
    try {
        const filter = await getScopingFilter(req.user);
        
        const [incidents]: any = await pool.query(`SELECT severity, COUNT(*) as count FROM security_incidents WHERE 1=1 ${filter} GROUP BY severity`);
        const [overrides]: any = await pool.query('SELECT COUNT(*) as count FROM audit_logs WHERE action = "FORCE_CHECK_IN_OVERRIDE"');
        const [gateTraffic]: any = await pool.query(`
            SELECT gt.movement_type, COUNT(*) as count 
            FROM gate_traffic gt
            JOIN gate_master gm ON gt.gate_id = gm.gate_id
            WHERE 1=1 ${filter.replace('facility_id', 'gm.facility_id')}
            GROUP BY gt.movement_type
        `);
        
        res.json({
            incidents,
            overrides: (overrides as any)[0]?.count || 0,
            trafficSummary: gateTraffic
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});

router.get('/restricted/zones/:zoneId/logs', authenticateToken, async (req: any, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT gt.*, u.username, hr.first_name, hr.last_name, hr.designation
            FROM gate_traffic gt
            JOIN auth_users u ON gt.user_id = u.id
            JOIN hr_employee_user_mapping m ON u.id = m.user_id
            JOIN hr_employees hr ON m.employee_id = hr.employee_id
            WHERE gt.pass_id IN (
                SELECT id FROM restricted_zone_access_requests WHERE zone_id = ? AND status = 'APPROVED'
            )
            ORDER BY gt.timestamp DESC
            LIMIT 50
        `, [req.params.zoneId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching zone logs' });
    }
});

export default router;
