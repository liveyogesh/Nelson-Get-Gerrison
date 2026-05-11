import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, scopeFacility } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(scopeFacility);

router.get('/daily-staff-movements', async (req: any, res: any) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    
    let query = `
      SELECT r.request_id, r.request_type, r.reason, r.current_status, r.is_priority, r.created_at,
             e.first_name, e.last_name, e.employee_code, d.department_name
      FROM gatepass_requests r
      JOIN hr_employees e ON r.employee_id = e.employee_id
      JOIN hr_departments d ON e.department_id = d.department_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (!req.isCorporate) {
      if (req.facilities && req.facilities.length > 0) {
        query += ` AND r.facility_id IN (?)`;
        params.push(req.facilities);
      } else {
        query += ` AND 1=0`; // No access
      }
    }

    if (startDate && endDate) {
      query += ` AND DATE(r.created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    if (departmentId && departmentId !== 'all') {
      query += ` AND d.department_id = ?`;
      params.push(departmentId);
    }
    
    query += ` ORDER BY r.created_at DESC`;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching daily staff movements:', error);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

router.get('/visitor-analytics', async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT v.purpose as purpose_of_visit, COUNT(*) as count 
      FROM visitor_visits v 
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (!req.isCorporate) {
      if (req.facilities && req.facilities.length > 0) {
        query += ` AND v.facility_id IN (?)`;
        params.push(req.facilities);
      } else {
        query += ` AND 1=0`;
      }
    }

    if (startDate && endDate) {
      query += ` AND DATE(v.expected_entry_time) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    query += ` GROUP BY v.purpose`;
    
    const [rows] = await db.query(query, params);
    
    // Also get frequency per day
    let freqQuery = `SELECT DATE(expected_entry_time) as date, COUNT(*) as count FROM visitor_visits WHERE 1=1`;
    let freqParams: any[] = [];
    if (!req.isCorporate) {
      if (req.facilities && req.facilities.length > 0) {
        freqQuery += ` AND facility_id IN (?)`;
        freqParams.push(req.facilities);
      } else {
        freqQuery += ` AND 1=0`;
      }
    }
    freqQuery += ` GROUP BY DATE(expected_entry_time) ORDER BY date DESC LIMIT 30`;
    
    const [freqRows] = await db.query(freqQuery, freqParams);
    
    res.json({ types: rows, frequency: freqRows });
  } catch (error) {
    console.error('Error fetching visitor analytics:', error);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

router.get('/security-violations', async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query;
    // For now we mock it as we don't have a violations table
    // Suppose late returns are a violation
    let query = `
      SELECT r.request_id, e.first_name, e.last_name, r.expected_return_time, 'LATE_RETURN' as violation_type
      FROM gatepass_requests r
      JOIN hr_employees e ON r.employee_id = e.employee_id
      WHERE r.current_status = 'APPROVED' 
      AND r.expected_return_time < NOW()
    `;
    const params: any[] = [];
    
    if (!req.isCorporate) {
      if (req.facilities && req.facilities.length > 0) {
        query += ` AND r.facility_id IN (?)`;
        params.push(req.facilities);
      } else {
        query += ` AND 1=0`;
      }
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

export default router;
