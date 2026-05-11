import * as fs from 'fs';
let content = fs.readFileSync('server/db.ts', 'utf8');

const tablesToAddDeletedAt = [
  'auth_roles',
  'auth_permissions',
  'hr_departments',
  'visitor_master',
  'visitor_visits',
  'gatepass_approvals',
  'gatepass_movements',
  'gatepass_violations',
  'restricted_zones',
  'system_notifications',
  'active_sessions'
];

for (const table of tablesToAddDeletedAt) {
  const regex = new RegExp(`(CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?)(FOREIGN KEY|INDEX|PRIMARY KEY(?!\\()|\\);)`, 'g');
  content = content.replace(regex, (match, p1, p2) => {
    if (!p1.includes('deleted_at DATETIME')) {
      return p1 + '      deleted_at DATETIME NULL,\n      ' + p2;
    }
    return match;
  });
}

const tablesToAddTimestamps = [
  'visitor_visits',
  'gatepass_approvals',
  'gatepass_movements',
  'gatepass_violations',
  'restricted_zones',
  'system_notifications',
  'active_sessions',
  'auth_roles',
  'auth_permissions'
];
for(const table of tablesToAddTimestamps) {
  const regex = new RegExp(`(CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?)(FOREIGN KEY|INDEX|PRIMARY KEY(?!\\()|deleted_at|\\);)`, 'g');
  content = content.replace(regex, (match, p1, p2) => {
    let mods = p1;
    if (!mods.includes('created_at DATETIME')) {
      mods += '      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n';
    }
    if (!mods.includes('updated_at DATETIME')) {
      mods += '      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n';
    }
    return mods + '      ' + p2;
  });
}

fs.writeFileSync('server/db.ts', content);
