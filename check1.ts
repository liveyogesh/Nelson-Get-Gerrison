import db from './server/db.js';
db.query("UPDATE employee_shift_assignments SET overrides_allowed = TRUE")
  .then(r => console.log('Successfully toggled overrides_allowed for testing'))
  .then(()=>process.exit(0));
