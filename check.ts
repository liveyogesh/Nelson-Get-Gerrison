import db from './server/db.js';
db.query('SHOW TABLES').then(r => console.log(r[0])).then(()=>process.exit(0))
