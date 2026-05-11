import fs from 'fs';
let code = fs.readFileSync('server/db.ts', 'utf8');

// Check the exact whitespace used by reading it.
const mangledRe = /AUTO_INCREMENT[\s\S]*?created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\s*updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\s*deleted_at DATETIME NULL,\s*PRIMARY KEY,/gm;
code = code.replace(mangledRe, 'AUTO_INCREMENT PRIMARY KEY,');

const mangledRe2 = /AUTO_INCREMENT[\s\S]*?deleted_at DATETIME NULL,\s*PRIMARY KEY,/gm;
code = code.replace(mangledRe2, 'AUTO_INCREMENT PRIMARY KEY,');

const mangledRe3 = /VARCHAR\(255\)[\s\S]*?created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\s*updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\s*deleted_at DATETIME NULL,\s*PRIMARY KEY,/gm;
code = code.replace(mangledRe3, 'VARCHAR(255) PRIMARY KEY,');

fs.writeFileSync('server/db.ts', code);
