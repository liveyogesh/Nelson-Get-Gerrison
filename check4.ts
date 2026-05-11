import db from './server/db.js';
db.query('DESCRIBE auth_users').then(r => console.log(r[0])).then(()=>process.exit(0));
