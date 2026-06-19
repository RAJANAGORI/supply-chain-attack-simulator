const path = require('path');
const { SCAS_PROVENANCE } = require('../scas-provenance');

const DEFAULT_ES_URL = process.env.SCAS_ES_URL || 'http://localhost:9200';

function getRepoRoot() {
  return path.resolve(__dirname, '../..');
}

function createEsClient(url = DEFAULT_ES_URL) {
  const { Client } = require('@elastic/elasticsearch');
  return new Client({ node: url });
}

function getEsUrl() {
  return DEFAULT_ES_URL;
}

module.exports = {
  SCAS_PROVENANCE,
  createEsClient,
  getEsUrl,
  getRepoRoot,
  INDICES: {
    RULES: 'scas-rules',
    DETECTIONS: 'scas-detections'
  }
};
