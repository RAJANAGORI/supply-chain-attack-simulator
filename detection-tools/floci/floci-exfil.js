/**
 * Optional Floci S3 mirror for SCAS scenarios (SCAS_FLOCI_ENABLED=1).
 * Walks up from cwd to find scripts/floci/floci-upload-json.sh (works from victim-app / packages).
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findUploadScript() {
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    const candidates = [
      path.join(dir, 'scripts', 'floci', 'floci-upload-json.sh'),
      path.join(dir, 'scripts', 'floci-upload-json.sh'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * @param {string} scenarioId - e.g. '06', '17', '21'
 * @param {string} keySuffix - e.g. 'stage1', 'harvested-credentials'
 * @param {object} payload
 * @param {string} [prefix] - S3 key prefix (default 'exfil', use 'chain' for scenario 17)
 */
function uploadJson(scenarioId, keySuffix, payload, prefix = 'exfil') {
  if (process.env.TESTBENCH_MODE !== 'enabled') return false;
  if (process.env.SCAS_FLOCI_ENABLED !== '1') return false;
  const script = findUploadScript();
  if (!script) {
    console.error(`SCAS runner: Floci CLI was not called for scenario ${scenarioId}. floci-upload-json.sh was not found.`);
    return false;
  }
  try {
    execFileSync(script, [String(scenarioId), keySuffix, prefix], {
      input: JSON.stringify(payload),
      stdio: ['pipe', 'inherit', 'inherit'],
      env: process.env,
    });
    return true;
  } catch {
    console.error(`SCAS runner: Floci CLI failed for scenario ${scenarioId}. The mock-server capture is a separate channel.`);
    return false;
  }
}

module.exports = { uploadJson, findUploadScript };
