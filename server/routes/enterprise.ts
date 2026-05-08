import express from 'express';
import pool from '../db.js';
import { authenticateToken, authorizePermissions, facilityScopeGuard } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

// 1. Corporate / Enterprise Overview
router.get('/dashboard/summary', authenticateToken, async (req: any, res) => {
    // Only CORPORATE scope users or SUPER_ADMIN see the enterprise overview
    if (req.user.scope !== 'CORPORATE' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Access Restricted: Corporate Scope Required.' });
    }

    try {
        const [facilities]: any = await pool.query('SELECT COUNT(*) as count FROM org_facilities');
        const [totalTraffic]: any = await pool.query('SELECT COUNT(*) as count FROM gate_traffic');
        const [incidents]: any = await pool.query('SELECT severity, COUNT(*) as count FROM security_incidents GROUP BY severity');
        const [facilityActivity]: any = await pool.query(`
            SELECT f.facility_name, COUNT(gt.id) as traffic_count 
            FROM org_facilities f
            LEFT JOIN gate_master gm ON f.facility_id = gm.facility_id
            LEFT JOIN gate_traffic gt ON gm.gate_id = gt.gate_id
            GROUP BY f.facility_id
        `);

        res.json({
            stats: {
                facilities: facilities[0].count,
                totalTraffic: totalTraffic[0].count,
                activeIncidents: incidents.reduce((acc: number, curr: any) => acc + curr.count, 0)
            },
            incidents,
            facilityActivity
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching enterprise summary' });
    }
});

// 2. Fetch Multi-Facility Hierarchy
router.get('/facilities/hierarchy', authenticateToken, async (req: any, res) => {
    try {
        const [rows]: any = await pool.query(`
            SELECT f1.*, f2.facility_name as parent_name
            FROM org_facilities f1
            LEFT JOIN org_facilities f2 ON f1.parent_facility_id = f2.facility_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching facility hierarchy' });
    }
});

// 3. Facility Management
router.post('/facilities', authenticateToken, authorizePermissions('system.manage'), async (req: any, res) => {
    const { name, code, parentId, category, region, timezone } = req.body;
    try {
        await pool.query(
            'INSERT INTO org_facilities (facility_name, facility_code, parent_facility_id, facility_category, regional_group, operational_timezone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, code, parentId || null, category || 'HOSPITAL', region, timezone || 'UTC']
        );
        await logAudit({ userId: req.user.id, action: 'FACILITY_CREATE', module: 'ENTERPRISE', newValues: { name, code } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error creating facility' });
    }
});

// 4. Scoped Reporting (Facility Comparison)
router.get('/reports/comparative', authenticateToken, async (req: any, res) => {
     if (req.user.scope !== 'CORPORATE' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Corporate access required for comparative analytics.' });
    }

    try {
        const [traffic]: any = await pool.query(`
            SELECT f.facility_name, DATE(gt.timestamp) as date, COUNT(*) as count
            FROM gate_traffic gt
            JOIN gate_master gm ON gt.gate_id = gm.gate_id
            JOIN org_facilities f ON gm.facility_id = f.facility_id
            WHERE gt.timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY f.facility_id, DATE(gt.timestamp)
        `);
        res.json(traffic);
    } catch (err) {
        res.status(500).json({ message: 'Error generating comparative report' });
    }
});

// 5. Inter-Facility Movement Logic
router.get('/movement/inter-facility', authenticateToken, async (req: any, res) => {
    try {
        // Find users checking in at different facilities from their primary one
        const [rows]: any = await pool.query(`
            SELECT u.username, f.facility_name as accessed_facility, gt.timestamp, gt.movement_type
            FROM gate_traffic gt
            JOIN gate_master gm ON gt.gate_id = gm.gate_id
            JOIN org_facilities f ON gm.facility_id = f.facility_id
            JOIN auth_users u ON gt.user_id = u.id
            JOIN employee_facility_access efa ON u.id = efa.user_id
            WHERE efa.facility_id != gm.facility_id
            ORDER BY gt.timestamp DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching inter-facility movement' });
    }
});

// 6. Facility Security Policy Management
export const getFacilityPolicy = async (facilityId: number, key: string) => {
    const [rows]: any = await pool.query(
        'SELECT policy_value FROM facility_security_policies WHERE facility_id = ? AND policy_key = ? AND is_active = TRUE',
        [facilityId, key]
    );
    return rows[0]?.policy_value || null;
};

router.get('/policies/:facilityId', authenticateToken, facilityScopeGuard, async (req: any, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM facility_security_policies WHERE facility_id = ?', [req.params.facilityId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching policies' });
    }
});

router.post('/policies', authenticateToken, authorizePermissions('system.manage'), async (req: any, res) => {
    const { facility_id, key, value, isActive } = req.body;
    try {
        await pool.query(
            'INSERT INTO facility_security_policies (facility_id, policy_key, policy_value, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE policy_value = ?, is_active = ?',
            [facility_id, key, value, isActive, value, isActive]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error updating policy' });
    }
});

// 7. Multi-Facility Device Monitoring
router.get('/devices/status', authenticateToken, async (req: any, res) => {
    if (req.user.scope !== 'CORPORATE' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Corporate access required for device oversight.' });
    }

    try {
        const [devices]: any = await pool.query(`
            SELECT d.*, f.facility_name, g.gate_name
            FROM security_devices d
            JOIN org_facilities f ON d.facility_id = f.facility_id
            LEFT JOIN gate_master g ON d.gate_id = g.gate_id
        `);
        res.json(devices);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching device status' });
    }
});

export default router;
