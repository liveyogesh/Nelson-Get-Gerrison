import fs from 'fs';
import path from 'path';

function findAndRemoveWeirdFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file.includes('\\nelson-garrison-old') || file.includes('file:')) {
      console.log('Found weird file:', filePath);
      fs.unlinkSync(filePath);
    } else if (fs.statSync(filePath).isDirectory() && file !== 'node_modules' && file !== '.git') {
      findAndRemoveWeirdFiles(filePath);
    }
  }
}
findAndRemoveWeirdFiles('.');
console.log('Done scanning for weird files.');