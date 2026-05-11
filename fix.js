const fs = require('fs');
['enterprise_hr_migration.ts', 'hr_normalization_engine.ts', 'hr_production_promotion.ts'].forEach(f => {
  let text = fs.readFileSync(f, 'utf8');
  text = text.replace(/\\`/g, '`');
  text = text.replace(/\\\$/g, '$');
  fs.writeFileSync(f, text);
});
