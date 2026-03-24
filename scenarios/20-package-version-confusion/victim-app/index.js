console.log('Starting victim app (Scenario 20: Package Version Confusion)...');

const fs = require('fs');
const path = require('path');

const victimRoot = process.cwd();
const scenarioRoot = path.join(victimRoot, '..');
const registryRoot = path.join(scenarioRoot, 'registry');

function semverParts(v) {
  const parts = String(v).split('.').map((n) => parseInt(n, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareSemver(a, b) {
  const ap = semverParts(a);
  const bp = semverParts(b);
  for (let i = 0; i < 3; i++) {
    if (ap[i] !== bp[i]) return ap[i] - bp[i];
  }
  return 0;
}

function installFromRegistry(chosenVersion) {
  const libName = 'version-confuser-lib';
  const src = path.join(registryRoot, libName, chosenVersion);
  const dst = path.join(victimRoot, 'node_modules', libName);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dst), { recursive: true });

  // Copy recursively (simple implementation)
  const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from, { withFileTypes: true }).forEach((ent) => {
      const f = path.join(from, ent.name);
      const t = path.join(to, ent.name);
      if (ent.isDirectory()) copyDir(f, t);
      else fs.copyFileSync(f, t);
    });
  };
  copyDir(src, dst);
}

const availableVersions = fs
  .readdirSync(path.join(registryRoot, 'version-confuser-lib'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// Simulate a risky range like "*" meaning “take the highest version”
const chosen = availableVersions.sort((a, b) => compareSemver(a, b)).slice(-1)[0];
console.log('Available versions:', availableVersions.join(', '));
console.log('Chosen version (highest match):', chosen);

installFromRegistry(chosen);

const installed = require('version-confuser-lib');
if (typeof installed.run === 'function') {
  console.log('Installed lib run:', installed.run());
}

fs.writeFileSync(
  path.join(victimRoot, 'installed-version.json'),
  JSON.stringify({ lib: 'version-confuser-lib', chosenVersion: chosen, timestamp: new Date().toISOString() }, null, 2)
);

