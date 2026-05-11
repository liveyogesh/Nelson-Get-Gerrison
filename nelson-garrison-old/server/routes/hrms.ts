import { Router } from 'express';
import db from '../db.js';
import { authorizePermissions } from '../middleware/auth.js';

const router = Router();

// Hypothetical HRMS Integration settings
const HRMS_API_BASE = process.env.HRMS_API_BASE || 'https://api.mock-hrms.com/v1';
const HRMS_API_KEY = process.env.HRMS_API_KEY || 'mock_key_123';

/**
 * Endpoint to trigger an on-demand synchronization with the HRMS
 * In a real-world scenario, this would fetch data from the HRMS API and map it to local db.
 */
router.post('/sync', authorizePermissions('SYSTEM_CONFIG'), async (req: any, res: any) => {
  try {
    // 1. Fetch data from hypothetical HRMS API
    // const response = await fetch(`${HRMS_API_BASE}/employees`, {
    //   headers: { 'Authorization': `Bearer ${HRMS_API_KEY}` }
    // });
    // const hrmsEmployees = await response.json();
    
    // For demonstration, we'll use a mocked payload
    const mockHrmsData = [
      {
        emp_id: "EMP001",
        first_name: "Sarah",
        last_name: "Smith",
        email: "sarah.s@nelson.com",
        phone: "+91 9876543210",
        department_code: "CARD",
        designation: "HOD",
        status: "ACTIVE"
      },
      {
        emp_id: "EMP002",
        first_name: "James",
        last_name: "Wilson",
        email: "j.wilson@nelson.com",
        phone: "+91 9876543211",
        department_code: "SEC",
        designation: "Supervisor",
        status: "INACTIVE" // meaning he should be deactivated
      }
    ];

    let syncedCount = 0;
    let deactivatedCount = 0;

    for (const emp of mockHrmsData) {
      // Data Mapping
      const isActive = emp.status === "ACTIVE";

      // Insert or Update HR Department if not exists
      await db.execute(
        'INSERT IGNORE INTO hr_departments (department_name) VALUES (?)',
        [emp.department_code]
      );

      // Get department ID
      const [dept]: any = await db.query(
        'SELECT department_id FROM hr_departments WHERE department_name = ?',
        [emp.department_code]
      );
      
      const deptId = dept[0]?.department_id || null;

      // Upsert Employee
      const [existing]: any = await db.query(
        'SELECT employee_id FROM hr_employees WHERE employee_code = ? OR email = ?',
        [emp.emp_id, emp.email]
      );

      if (existing.length > 0) {
        await db.execute(
          'UPDATE hr_employees SET first_name = ?, last_name = ?, department_id = ?, designation = ?, status = ? WHERE employee_id = ?',
          [emp.first_name, emp.last_name, deptId, emp.designation, isActive ? 'ACTIVE' : 'INACTIVE', existing[0].employee_id]
        );
        if (!isActive) deactivatedCount++;
      } else {
        await db.execute(
          'INSERT INTO hr_employees (employee_code, first_name, last_name, email, mobile, department_id, designation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [emp.emp_id, emp.first_name, emp.last_name, emp.email, emp.phone, deptId, emp.designation, isActive ? 'ACTIVE' : 'INACTIVE']
        );
        syncedCount++;
      }
    }

    res.json({ success: true, message: `HRMS Sync Complete. Synced: ${syncedCount}, Deactivated: ${deactivatedCount}` });
  } catch (err: any) {
    console.error('HRMS Sync Error:', err);
    res.status(500).json({ error: 'HRMS Synchronization completely failed' });
  }
});

export default router;
