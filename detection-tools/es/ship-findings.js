const path = require('path');
const { spawnSync } = require('child_process');
const { createEsClient, getRepoRoot, INDICES } = require('./client');

function findingToDetection(finding, scenarioId = '') {
  const details = finding.details || {};
  return {
    '@timestamp': finding.timestamp || new Date().toISOString(),
    scenario_id: scenarioId || details.scenario_id || '',
    event_type: 'scanner_finding',
    severity: finding.severity || 'INFO',
    message: finding.message || '',
    rule: {
      id: details.ruleId || finding.type || 'unknown'
    },
    source: details.package || details.file || '',
    destination: details.destination || '',
    package: {
      name: details.package || '',
      version: details.version || ''
    },
    detail: details
  };
}

async function shipFindingsFromResult(result, options = {}, client = createEsClient()) {
  const scenarioId = options.scenarioId || '';
  const operations = [];

  for (const finding of result.findings || []) {
    operations.push({ index: { _index: INDICES.DETECTIONS } });
    operations.push(findingToDetection(finding, scenarioId));
  }

  if (operations.length === 0) {
    return { indexed: 0 };
  }

  const response = await client.bulk({ refresh: true, operations });
  if (response.errors) {
    const failed = (response.items || []).filter((item) => {
      const action = item.index || item.create;
      return action && action.error;
    });
    throw new Error(`Bulk index errors: ${JSON.stringify(failed.slice(0, 3))}`);
  }

  return { indexed: operations.length / 2 };
}

async function scanAndShip(projectPath, options = {}, client = createEsClient()) {
  const scannerPath = path.join(getRepoRoot(), 'detection-tools/package-scanner.js');
  const run = spawnSync(process.execPath, [scannerPath, projectPath, '--json'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (!run.stdout) {
    throw new Error(run.stderr || 'package-scanner produced no output');
  }

  const result = JSON.parse(run.stdout);
  const shipped = await shipFindingsFromResult(result, options, client);
  return { ...shipped, exitCode: result.exitCode, findings: result.findings.length };
}

async function main() {
  const args = process.argv.slice(2);
  const projectPath = args.find((arg) => !arg.startsWith('--')) || process.cwd();
  const scenarioFlag = args.find((arg) => arg.startsWith('--scenario='));
  const scenarioId = scenarioFlag ? scenarioFlag.split('=')[1] : '';

  const result = await scanAndShip(projectPath, { scenarioId });
  process.stdout.write(
    `Indexed ${result.indexed} scanner findings (${result.findings} total) from ${projectPath}\n`
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`ship-findings failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { shipFindingsFromResult, scanAndShip, findingToDetection };
