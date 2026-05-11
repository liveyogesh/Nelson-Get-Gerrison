import { Router } from 'express';
import db from '../db.js';
import { authorizePermissions } from '../middleware/auth.js';

const router = Router();

// Get all users
router.get('/', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const [users]: any = await db.query(`
      SELECT 
        u.id, u.username as name, u.email, u.is_active, u.locked_until,
        emp.department_id, d.department_name as department
      FROM auth_users u
      LEFT JOIN hr_employee_user_mapping m ON u.id = m.user_id
      LEFT JOIN hr_employees emp ON m.employee_id = emp.employee_id
      LEFT JOIN hr_departments d ON emp.department_id = d.department_id
    `);

    // Fetch roles for each user
    const [userRoles]: any = await db.query(`
      SELECT ur.user_id, r.role_code 
      FROM auth_user_roles ur
      JOIN auth_roles r ON ur.role_id = r.id
    `);

    const usersWithRoles = users.map((user: any) => {
      const isLocked = user.locked_until && new Date(user.locked_until) > new Date();
      return {
        ...user,
        roles: userRoles.filter((ur: any) => ur.user_id === user.id).map((ur: any) => ur.role_code),
        status: user.is_active ? 'Active' : 'Suspended',
        locked: isLocked
      };
    });

    res.json(usersWithRoles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update user details & roles
router.put('/:id', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { status, roles, is_active, locked } = req.body;
    const userId = req.params.id;

    // Update active status
    if (status !== undefined || is_active !== undefined) {
      const active = status === 'Active' ? true : status === 'Suspended' ? false : is_active;
      await db.execute('UPDATE auth_users SET is_active = ? WHERE id = ?', [active, userId]);
    }

    // Update locked status (unlocking)
    if (locked === false) {
       await db.execute('UPDATE auth_users SET locked_until = NULL, failed_attempts = 0 WHERE id = ?', [userId]);
    } else if (locked === true) {
       await db.execute('UPDATE auth_users SET locked_until = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE id = ?', [userId]);
    }

    // Update roles
    if (roles && Array.isArray(roles)) {
      await db.execute('DELETE FROM auth_user_roles WHERE user_id = ?', [userId]);
      for (const roleCode of roles) {
        const [role]: any = await db.query('SELECT id FROM auth_roles WHERE role_code = ?', [roleCode]);
        if (role.length > 0) {
          await db.execute('INSERT INTO auth_user_roles (user_id, role_id) VALUES (?, ?)', [userId, role[0].id]);
        }
      }
    }

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
