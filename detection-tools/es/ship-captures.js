const fs = require('fs');
const path = require('path');
const { createEsClient, getRepoRoot, INDICES } = require('./client');

function inferScenarioIdFromPath(filePath) {
  const parts = filePath.split(path.sep);
  const scenarioPart = parts.find((part) => /^\d{2}-/.test(part));
  if (!scenarioPart) return '';
  const match = scenarioPart.match(/^(\d+)-/);
  return match ? match[1].padStart(2, '0') : '';
}

function captureRecordToDetection(scenarioId, record) {
  const timestamp = record.timestamp || record.received_at || new Date().toISOString();
  const data = record.data || record.payload || record;
  const packageInfo = (data && data.package) || {};

  let destination = '';
  if (typeof data === 'object' && data !== null) {
    destination = data.destination || '';
  }

  return {
    '@timestamp': timestamp,
    scenario_id: scenarioId,
    event_type: 'exfil_capture',
    severity: 'HIGH',
    message: `Exfiltration capture for scenario ${scenarioId}`,
    rule: { id: record.attackType || 'exfil_capture' },
    source: packageInfo.name || record.attackType || '',
    destination,
    package: {
      name: packageInfo.name || '',
      version: packageInfo.version || ''
    },
    detail: record
  };
}

function normalizeCaptureFile(filePath, raw) {
  const scenarioId = inferScenarioIdFromPath(filePath);
  const records = [];

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      records.push(captureRecordToDetection(scenarioId, entry));
    }
    return records;
  }

  if (raw.captures && Array.isArray(raw.captures)) {
    for (const entry of raw.captures) {
      records.push(captureRecordToDetection(scenarioId, entry));
    }
  }

  if (raw.beacons && Array.isArray(raw.beacons)) {
    for (const entry of raw.beacons) {
      records.push(captureRecordToDetection(scenarioId, entry));
    }
  }

  if (raw.events && Array.isArray(raw.events)) {
    for (const entry of raw.events) {
      records.push(captureRecordToDetection(scenarioId, entry));
    }
  }

  return records;
}

function findCaptureFiles(repoRoot = getRepoRoot()) {
  const results = [];
  const scenariosDir = path.join(repoRoot, 'scenarios');

  for (const scenarioDir of fs.readdirSync(scenariosDir, { withFileTypes: true })) {
    if (!scenarioDir.isDirectory()) continue;
    const infraDir = path.join(scenariosDir, scenarioDir.name, 'infrastructure');
    for (const fileName of ['captured-data.json', 'captured-credentials.json']) {
      const capturePath = path.join(infraDir, fileName);
      if (fs.existsSync(capturePath)) {
        results.push(capturePath);
      }
    }
  }

  return results.sort();
}

async function shipCaptures(client = createEsClient(), repoRoot = getRepoRoot()) {
  const files = findCaptureFiles(repoRoot);
  const operations = [];

  for (const filePath of files) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }

    for (const doc of normalizeCaptureFile(filePath, raw)) {
      operations.push({ index: { _index: INDICES.DETECTIONS } });
      operations.push(doc);
    }
  }

  if (operations.length === 0) {
    return { indexed: 0, files: files.length };
  }

  const response = await client.bulk({ refresh: true, operations });
  if (response.errors) {
    const failed = (response.items || []).filter((item) => {
      const action = item.index || item.create;
      return action && action.error;
    });
    throw new Error(`Bulk index errors: ${JSON.stringify(failed.slice(0, 3))}`);
  }

  return { indexed: operations.length / 2, files: files.length };
}

async function main() {
  const result = await shipCaptures();
  process.stdout.write(`Indexed ${result.indexed} capture events from ${result.files} files into ${INDICES.DETECTIONS}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`ship-captures failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  shipCaptures,
  findCaptureFiles,
  normalizeCaptureFile,
  captureRecordToDetection,
  inferScenarioIdFromPath
};
