import * as fs from 'fs';

let content = fs.readFileSync('server/db.ts', 'utf8');

const tablesToFix = [
  'auth_roles',
  'auth_permissions',
  'visitor_visits',
  'gatepass_approvals',
  'gatepass_movements',
  'gatepass_violations',
  'restricted_zones'
];

content = content.replace(/AUTO_INCREMENT\\s+created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\\s*updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\\s*deleted_at DATETIME NULL,\\s*PRIMARY KEY,/g, 'AUTO_INCREMENT PRIMARY KEY,');

// Since we replaced the created_at/updated_at at the top, let's append them back at the end of the table.
for (const table of tablesToFix) {
  const regex = new RegExp(`(CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?)(FOREIGN KEY|INDEX|\\);)`, 'g');
  // Only add if not already there correctly
  content = content.replace(regex, (match, p1, p2) => {
    let mods = p1;
    if (!mods.includes('created_at DATETIME')) {
      mods += '      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n';
    }
    if (!mods.includes('updated_at DATETIME')) {
      mods += '      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n';
    }
    if (!mods.includes('deleted_at DATETIME')) {
      mods += '      deleted_at DATETIME NULL,\n';
    }
    return mods + '      ' + p2;
  });
}

// Add late_return to gatepass_movements
if (!content.includes('late_return BOOLEAN')) {
  // find gatepass_movements
  content = content.replace(
    'security_guard_id INT,',
    'security_guard_id INT,\n      late_return BOOLEAN DEFAULT FALSE,'
  );
}

// Add is_priority to gatepass_requests
if (!content.includes('is_priority BOOLEAN')) {
  content = content.replace(
    'emergency_flag BOOLEAN DEFAULT FALSE,',
    'emergency_flag BOOLEAN DEFAULT FALSE,\n      is_priority BOOLEAN DEFAULT FALSE,\n      priority_reason VARCHAR(255),'
  );
}

// Add parent_department_id to hr_departments 
if (!content.includes('parent_department_id INT')) {
  content = content.replace(
    'department_name VARCHAR(100) NOT NULL,',
    'department_name VARCHAR(100) NOT NULL,\n      parent_department_id INT,'
  );
}

fs.writeFileSync('server/db.ts', content);
