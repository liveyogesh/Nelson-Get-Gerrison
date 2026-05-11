import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, authorizePermissions, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Get all roles
router.get('/', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const [roles]: any = await db.query(`
      SELECT r.*, 
             (SELECT COUNT(DISTINCT ur.user_id) FROM auth_user_roles ur WHERE ur.role_id = r.id) as assigned_users_count,
             (SELECT COUNT(*) FROM auth_role_permissions rp WHERE rp.role_id = r.id) as total_permissions_count,
             (
               SELECT COUNT(DISTINCT d.department_id) 
               FROM auth_user_roles ur 
               JOIN hr_employee_user_mapping m ON ur.user_id = m.user_id
               JOIN hr_employees emp ON m.employee_id = emp.employee_id
               JOIN hr_departments d ON emp.department_id = d.department_id
               WHERE ur.role_id = r.id
             ) as departments_count,
             (
               SELECT COUNT(DISTINCT d.facility_id)
               FROM auth_user_roles ur
               JOIN hr_employee_user_mapping m ON ur.user_id = m.user_id
               JOIN hr_employees emp ON m.employee_id = emp.employee_id
               JOIN hr_departments d ON emp.department_id = d.department_id
               WHERE ur.role_id = r.id
             ) as facilities_count,
             (
               SELECT COUNT(*)
               FROM auth_role_permissions rp
               JOIN auth_permissions p ON rp.permission_id = p.id
               WHERE rp.role_id = r.id AND (p.permission_key LIKE '%OVERRIDE%' OR p.permission_key LIKE '%DELETE%' OR p.permission_key LIKE '%ESCALATE%')
             ) as high_risk_count
      FROM auth_roles r
      WHERE r.deleted_at IS NULL
    `);
    
    // Fetch permissions for each role
    const [rolePerms]: any = await db.query(`
      SELECT rp.role_id, p.id as permission_id, p.permission_key, p.module_name, p.description 
      FROM auth_role_permissions rp
      JOIN auth_permissions p ON rp.permission_id = p.id
      WHERE p.active_status = TRUE
    `);

    // Group permissions by role
    const rolesWithPerms = roles.map((role: any) => ({
      ...role,
      permissions: rolePerms.filter((rp: any) => rp.role_id === role.id)
    }));

    res.json(rolesWithPerms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create role
router.post('/', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { role_name, role_code, description, active_status, permissions } = req.body;
    const userId = req.user?.id || 1;

    if (!role_name || !role_code) {
      throw new Error("Role name and code are required.");
    }
    const code = role_code.toUpperCase().replace(/\s+/g, '_');

    const [existing]: any = await connection.query('SELECT id FROM auth_roles WHERE role_code = ? OR role_name = ?', [code, role_name]);
    if (existing.length > 0) throw new Error("Role with this name or code already exists.");

    const [result]: any = await connection.execute(
      'INSERT INTO auth_roles (role_name, role_code, description, active_status) VALUES (?, ?, ?, ?)',
      [role_name, code, description, active_status !== undefined ? active_status : true]
    );
    const newRoleId = result.insertId;

    if (permissions && Array.isArray(permissions)) {
      for (const pKey of permissions) {
        const [perm]: any = await connection.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [pKey]);
        if (perm.length > 0) {
           await connection.execute('INSERT INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [newRoleId, perm[0].id]);
        }
      }
    }

    await connection.commit();
    await logAudit(userId, 'ROLE_CREATED', 'RBAC', 'auth_roles', newRoleId, null, { role_name, role_code: code, description, active_status, permissions }, req);

    res.json({ success: true, id: newRoleId });
  } catch (err: any) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Update role basic info
router.put('/:id', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { role_name, description, active_status } = req.body;
    const roleId = req.params.id;
    const userId = req.user?.id || 1;

    // Check system roles
    const [existingRole]: any = await db.query('SELECT role_code, role_name, description, active_status FROM auth_roles WHERE id = ?', [roleId]);
    if (existingRole.length === 0) return res.status(404).json({ error: 'Role not found' });
    
    if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(existingRole[0].role_code) && active_status === false) {
      return res.status(400).json({ error: 'Cannot deactivate protected system roles.' });
    }

    await db.execute(
      'UPDATE auth_roles SET role_name = ?, description = ?, active_status = ? WHERE id = ?',
      [role_name, description, active_status, roleId]
    );

    await logAudit(userId, 'ROLE_UPDATED', 'RBAC', 'auth_roles', roleId, existingRole[0], { role_name, description, active_status }, req);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete role (soft delete)
router.delete('/:id', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const roleId = req.params.id;
    const userId = req.user?.id || 1;

    const [existingRole]: any = await db.query('SELECT role_code FROM auth_roles WHERE id = ?', [roleId]);
    if (existingRole.length === 0) return res.status(404).json({ error: 'Role not found' });

    if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(existingRole[0].role_code)) {
      return res.status(400).json({ error: 'Cannot delete protected system roles.' });
    }

    const [userMapped]: any = await db.query('SELECT COUNT(*) as c FROM auth_user_roles WHERE role_id = ?', [roleId]);
    if (userMapped[0].c > 0) {
      return res.status(400).json({ error: `Cannot delete role. ${userMapped[0].c} users are currently mapped to it.` });
    }

    await db.execute('UPDATE auth_roles SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [userId, roleId]);

    await logAudit(userId, 'ROLE_DELETED', 'RBAC', 'auth_roles', roleId, { ...existingRole[0] }, { deleted_at: new Date() }, req);

    res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update role permissions
router.put('/:id/permissions', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { permissions } = req.body; // array of permission_keys
    const roleId = req.params.id;
    const userId = req.user?.id || 1;

    const [existingRole]: any = await connection.query('SELECT role_code FROM auth_roles WHERE id = ?', [roleId]);
    if (existingRole.length === 0) throw new Error("Role not found");

    if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(existingRole[0].role_code)) {
      // Prevent stripping core permissions. For simplicity: SUPER_ADMIN shouldn't really be modified or must have certain core perm.
      // But we will allow modification assuming the user confirms it in the UI (or we can block).
      if (permissions.length === 0) throw new Error("Cannot remove all permissions from system admin roles.");
    }

    // Get current perms
    const [currentPerms]: any = await connection.query(`
      SELECT p.permission_key FROM auth_role_permissions rp 
      JOIN auth_permissions p ON rp.permission_id = p.id 
      WHERE rp.role_id = ?
    `, [roleId]);

    const oldPermsList = currentPerms.map((rp: any) => rp.permission_key);

    await connection.execute('DELETE FROM auth_role_permissions WHERE role_id = ?', [roleId]);

    for (const pKey of permissions) {
      const [perm]: any = await connection.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [pKey]);
      if (perm.length > 0) {
         await connection.execute('INSERT INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, perm[0].id]);
      }
    }

    await connection.commit();
    await logAudit(userId, 'ROLE_PERMISSIONS_UPDATED', 'RBAC', 'auth_roles', roleId, { permissions: oldPermsList }, { permissions }, req);

    res.json({ success: true, message: 'Permissions updated successfully.' });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Assign individual permission
router.post('/:id/permissions/assign', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const roleId = req.params.id;
    const { permission_key } = req.body;
    const userId = req.user?.id || 1;

    const [perm]: any = await db.query('SELECT id, module_name FROM auth_permissions WHERE permission_key = ?', [permission_key]);
    if (perm.length === 0) return res.status(404).json({ error: 'Permission not found' });
    
    // Dependency Validation
    const [currentPerms]: any = await db.query(`
      SELECT p.permission_key FROM auth_role_permissions rp 
      JOIN auth_permissions p ON rp.permission_id = p.id 
      WHERE rp.role_id = ?
    `, [roleId]);
    
    const assignedKeys = currentPerms.map((rp: any) => rp.permission_key);

    const keyLower = permission_key.toLowerCase();
    if (keyLower.includes('approve') || keyLower.includes('cancel') || keyLower.includes('escalate') || keyLower.includes('override')) {
        // Just checking if they have SOME base view or manage permission for that module.
        // E.g. "APPROVE_GATEPASS" requires "MANAGE_OWN_GATEPASS" or "VIEW_ALL_GATEPASSES"
        const module = perm[0].module_name;
        const [modulePerms]: any = await db.query('SELECT permission_key FROM auth_role_permissions rp JOIN auth_permissions p ON rp.permission_id = p.id WHERE rp.role_id = ? AND p.module_name = ?', [roleId, module]);
        
        let hasBase = false;
        for (const mp of modulePerms) {
            const m = mp.permission_key.toLowerCase();
            if (m.includes('view') || m.includes('create') || m.includes('manage') || m.includes('access')) {
                hasBase = true;
                break;
            }
        }
        if (!hasBase) {
           return res.status(400).json({ error: `Cannot assign elevated permission ${permission_key} without base module access (view, create, manage, or access).` });
        }
    }

    try {
      await db.execute('INSERT INTO auth_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, perm[0].id]);
      await logAudit(userId, 'PERMISSION_ASSIGNED', 'RBAC', 'auth_role_permissions', roleId, null, { permission_key }, req);
    } catch(e: any) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke individual permission
router.post('/:id/permissions/revoke', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const roleId = req.params.id;
    const { permission_key } = req.body;
    const userId = req.user?.id || 1;

    const [existingRole]: any = await db.query('SELECT role_code FROM auth_roles WHERE id = ?', [roleId]);
    if (existingRole.length > 0 && ['SUPER_ADMIN'].includes(existingRole[0].role_code)) {
      const coreSafeList = ['SUPER_ADMIN']; // mock
      // In a real system, you might forbid revocation of any permission from SUPER_ADMIN
    }

    const [perm]: any = await db.query('SELECT id FROM auth_permissions WHERE permission_key = ?', [permission_key]);
    if (perm.length > 0) {
      await db.execute('DELETE FROM auth_role_permissions WHERE role_id = ? AND permission_id = ?', [roleId, perm[0].id]);
      await logAudit(userId, 'PERMISSION_REVOKED', 'RBAC', 'auth_role_permissions', roleId, { permission_key }, null, req);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all available permissions grouped by module
router.get('/permissions', authorizePermissions('SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const [perms]: any = await db.query('SELECT p.* FROM auth_permissions p WHERE active_status = TRUE ORDER BY p.module_name, p.permission_group, p.permission_key');
    
    // Group them
    const grouped = perms.reduce((acc: any, p: any) => {
      const module = p.module_name || 'General';
      if (!acc[module]) acc[module] = [];
      acc[module].push(p);
      return acc;
    }, {});

    res.json(grouped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
