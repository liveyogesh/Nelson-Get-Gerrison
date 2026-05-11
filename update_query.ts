import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'routes', 'gatepass.ts');
let content = fs.readFileSync(file, 'utf8');

const selectString = "SELECT r.*, e.first_name, e.last_name, e.employee_code, e.photo_url, d.department_name, des.designation_name FROM gatepass_requests r JOIN hr_employees e ON r.employee_id = e.employee_id LEFT JOIN hr_departments d ON e.department_id = d.department_id LEFT JOIN hr_designations des ON e.designation_id = des.designation_id";

content = content.replace(/SELECT r\.\*, e\.first_name, e\.last_name FROM gatepass_requests r JOIN hr_employees e ON r\.employee_id = e\.employee_id/g, selectString);

const jsonReplacement = `res.json({
        id: pass.request_id,
        type: pass.request_type,
        employeeName: (pass.first_name + ' ' + (pass.last_name || '')).trim(),
        employeeCode: pass.employee_code,
        department: pass.department_name,
        designation: pass.designation_name,
        photoUrl: pass.photo_url,
        reason: pass.reason,
        status: pass.current_status,
        expectedReturnTime: pass.expected_return_time,
        is_priority: pass.is_priority,
        is_emergency: pass.is_emergency
    });`;

content = content.replace(/res\.json\(\{\s*id: pass\.request_id,\s*type: pass\.request_type,\s*employeeName: [^,]+,\s*status: pass\.current_status\s*\}\);/g, jsonReplacement);

fs.writeFileSync(file, content);
console.log('Done');
