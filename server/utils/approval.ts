import db from '../db.js';

export const checkDualAuthorization = async (requestId: number) => {
  try {
    // Logic: Requires approval from HOD AND Security/IT Admin
    const [approvals]: any = await db.query(`
      SELECT r.role_code
      FROM gatepass_approvals a
      JOIN auth_users u ON a.approver_id = u.id
      JOIN auth_roles r ON u.role = r.role_code
      WHERE a.request_id = ? AND a.status = 'APPROVED'
    `, [requestId]);

    const hasHOD = approvals.some((a: any) => a.role_code === 'HOD');
    const hasAdmin = approvals.some((a: any) => a.role_code === 'FACILITY_ADMIN' || a.role_code === 'SUPER_ADMIN' || a.role_code === 'FACILITY_SECURITY_OFFICER');

    return hasHOD && hasAdmin;
  } catch (err) {
    console.error('Dual auth check failed:', err);
    return false;
  }
};
