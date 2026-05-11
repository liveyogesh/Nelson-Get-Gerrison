import db from './server/db.js';

async function testUsers() {
    try {
        const [users]: any = await db.query(`
          SELECT 
            u.id, u.username as name, u.email, u.is_active, u.locked_until,
            emp.department_id, d.department_name as department
          FROM auth_users u
          LEFT JOIN hr_employee_user_mapping m ON u.id = m.user_id
          LEFT JOIN hr_employees emp ON m.employee_id = emp.employee_id
          LEFT JOIN hr_departments d ON emp.department_id = d.department_id
          ORDER BY u.created_at DESC
        `);
        console.log('Users Query OK:', users.length);
    } catch(e: any) {
        console.error('Users DB Error:', e.message);
    }
    process.exit(0);
}
testUsers();
