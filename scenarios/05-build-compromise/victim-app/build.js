'use strict';

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
fs.mkdirSync(distDir, { recursive: true });

const appCode = `'use strict';
console.log('Victim application is running.');
module.exports = { version: '1.0.0' };
`;

fs.writeFileSync(path.join(distDir, 'app.js'), appCode);
fs.writeFileSync(
  path.join(distDir, 'manifest.json'),
  JSON.stringify({ version: '1.0.0', buildSystem: 'github-actions' }, null, 2)
);

console.log('Build complete: dist/app.js, dist/manifest.json');
