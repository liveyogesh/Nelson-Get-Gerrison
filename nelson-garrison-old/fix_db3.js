import * as fs from 'fs';
let content = fs.readFileSync('server/db.ts', 'utf8');

if (content.includes('movement_id INT AUTO_INCREMENT             created_at DATETIME')) {
  content = content.replace(
    'movement_id INT AUTO_INCREMENT             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n      deleted_at DATETIME NULL,\n      PRIMARY KEY,',
    'movement_id INT AUTO_INCREMENT PRIMARY KEY,'
  );
}

// Ensure the standard created/updated/deleted fields are at the bottom of the table
fs.writeFileSync('server/db.ts', content);
