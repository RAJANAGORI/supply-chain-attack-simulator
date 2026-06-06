const path = require('path');
const { captureRecordToDetection, inferScenarioIdFromPath } = require('./ship-captures');
const { SCAS_PROVENANCE } = require('../scas-provenance');

function inferScenarioId(infrastructureDir) {
  const scenarioFolder = path.basename(path.dirname(infrastructureDir));
  const match = scenarioFolder.match(/^(\d+)-/);
  if (match) return match[1].padStart(2, '0');
  return inferScenarioIdFromPath(infrastructureDir);
}

async function indexDetectionDoc(doc, esUrl) {
  const response = await fetch(`${esUrl.replace(/\/$/, '')}/scas-detections/_doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Elasticsearch index failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function forwardCaptureIfEnabled(infrastructureDir, record) {
  const esUrl = process.env.SCAS_ES_URL;
  if (!esUrl) return null;

  const scenarioId = inferScenarioId(infrastructureDir);
  const doc = captureRecordToDetection(scenarioId, record);
  return indexDetectionDoc(doc, esUrl);
}

module.exports = {
  forwardCaptureIfEnabled,
  inferScenarioId,
  indexDetectionDoc,
  SCAS_PROVENANCE
};
