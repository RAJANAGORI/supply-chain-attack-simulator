/**
 * Copies cache-poisoned module into node_modules and loads it to trigger evidence.
 */

const fs = require('fs');
const path = require('path');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  });
}

const projectRoot = process.cwd(); // victim-app
const scenarioRoot = path.join(projectRoot, '..');
const cacheLibSrc = path.join(scenarioRoot, 'cache', 'cache-lib');
const nodeModulesLibDst = path.join(projectRoot, 'node_modules', 'cache-lib');

if (!fs.existsSync(cacheLibSrc)) {
  console.log('Cache-lib not present; skipping install-from-cache.');
  process.exit(0);
}

try {
  fs.rmSync(nodeModulesLibDst, { recursive: true, force: true });
} catch (e) {
  // ignore
}

copyDir(cacheLibSrc, nodeModulesLibDst);

// Load immediately to trigger any attack behavior
require('cache-lib');

console.log('Installed cache-lib from poisoned cache (Scenario 16).');

