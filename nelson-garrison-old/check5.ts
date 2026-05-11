import db from './server/db.js';
db.query('SELECT username, id, password_hash, is_active FROM auth_users').then(r => console.log(r[0])).then(()=>process.exit(0));
