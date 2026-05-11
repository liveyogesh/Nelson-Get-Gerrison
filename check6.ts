import db from './server/db.js';
db.query('DESCRIBE auth_permissions').then(r => console.log(r[0])).then(()=>process.exit(0));
