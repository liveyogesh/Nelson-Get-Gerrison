import { Router } from 'express';
import db from '../db.js';
import { authorizePermissions } from '../middleware/auth.js';

const router = Router();

// Get all roles
router.get('/', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const [roles]: any = await db.query('SELECT * FROM auth_roles');
    
    // Fetch permissions for each role
    const [rolePerms]: any = await db.query(`
      SELECT rp.role_id, p.permission_key, p.module_name, p.description 
      FROM auth_role_permissions rp
      JOIN auth_permissions p ON rp.permission_id = p.id
    `);

    // Group permissions by role
    const rolesWithPerms = roles.map((role: any) => ({
      ...role,
      permissions: rolePerms.filter((rp: any) => rp.role_id === role.id).map((rp: any) => rp.permission_key)
    }));

    res.json(rolesWithPerms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update role permissions
router.put('/:id/permissions', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { permissions } = req.body; // array of permission_keys
    const roleId = req.params.id;

    // Delete existing
    await db.execute('DELETE FROM auth_role_permissions WHERE role_id = ?', [roleId]);

    // Insert new
    for (const pKey of permissions) {
      // Find permission_id
      const [perm]: any = await db.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [pKey]);
      if (perm.length > 0) {
         await db.execute('INSERT INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, perm[0].id]);
      }
    }

    res.json({ success: true, message: 'Permissions updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all available permissions
router.get('/permissions', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const [perms]: any = await db.query('SELECT * FROM auth_permissions ORDER BY module_name, permission_key');
    res.json(perms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create role
router.post('/', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { role_name, role_code, description } = req.body;
    const [result]: any = await db.execute(
      'INSERT INTO auth_roles (role_name, role_code, description) VALUES (?, ?, ?)',
      [role_name, role_code, description]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
