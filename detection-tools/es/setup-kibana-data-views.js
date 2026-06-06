const metadata = require('./scenario-observability.json');

const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';

async function kibanaRequest(pathname, options = {}) {
  const response = await fetch(`${KIBANA_URL}${pathname}`, {
    ...options,
    headers: {
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Kibana ${pathname} failed (${response.status}): ${text}`);
  }

  return body;
}

async function findDataViewByTitle(title) {
  const result = await kibanaRequest('/api/data_views');
  return (result.data_view || []).find((view) => view.title === title || view.name === title);
}

async function ensureDataView({ title, name, timeFieldName }) {
  const existing = await findDataViewByTitle(title);
  if (existing) {
    return { id: existing.id, title: existing.title, created: false };
  }

  const created = await kibanaRequest('/api/data_views/data_view', {
    method: 'POST',
    body: JSON.stringify({
      data_view: { title, name, timeFieldName }
    })
  });

  return { id: created.data_view.id, title: created.data_view.title, created: true };
}

async function findSavedObject(type, title) {
  const query = encodeURIComponent(`${type}.attributes.title:"${title}"`);
  const result = await kibanaRequest(`/api/saved_objects/_find?type=${type}&search=${query}&per_page=100`);
  return (result.saved_objects || []).find((obj) => obj.attributes.title === title);
}

async function ensureSavedSearch({ title, description, indexPatternId, kuery, columns, sort }) {
  const existing = await findSavedObject('search', title);
  if (existing) {
    return { id: existing.id, title, created: false };
  }

  const searchSourceJSON = JSON.stringify({
    query: { language: 'kuery', query: kuery },
    filter: [],
    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
  });

  const created = await kibanaRequest('/api/saved_objects/search', {
    method: 'POST',
    body: JSON.stringify({
      attributes: {
        title,
        description,
        columns,
        sort: sort || [['@timestamp', 'desc']],
        kibanaSavedObjectMeta: { searchSourceJSON }
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: indexPatternId
        }
      ]
    })
  });

  return { id: created.id, title, created: true };
}

async function main() {
  const rulesView = await ensureDataView({
    title: 'scas-rules',
    name: 'SCAS Rules',
    timeFieldName: 'ingested_at'
  });

  const detectionsView = await ensureDataView({
    title: 'scas-detections',
    name: 'SCAS Detections',
    timeFieldName: '@timestamp'
  });

  process.stdout.write(
    `Data views: ${rulesView.title} (${rulesView.created ? 'created' : 'exists'}), ${detectionsView.title} (${detectionsView.created ? 'created' : 'exists'})\n`
  );

  let createdSearches = 0;
  for (const scenario of metadata) {
    const id = scenario.scenario_id;
    const ruleSearch = await ensureSavedSearch({
      title: `SCAS Rules — Scenario ${id}`,
      description: `${scenario.title} detection runbook (scas-rules)`,
      indexPatternId: rulesView.id,
      kuery: `scenario_id: "${id}"`,
      columns: ['scenario_id', 'scenario_name', 'title', 'iocs', 'sigma'],
      sort: [['ingested_at', 'desc']]
    });
    const detectionSearch = await ensureSavedSearch({
      title: `SCAS Detections — Scenario ${id}`,
      description: `${scenario.title} runtime events (scas-detections)`,
      indexPatternId: detectionsView.id,
      kuery: `scenario_id: "${id}"`,
      columns: ['@timestamp', 'scenario_id', 'event_type', 'severity', 'message', 'source']
    });
    if (ruleSearch.created || detectionSearch.created) {
      createdSearches += 1;
    }
    process.stdout.write(`  Scenario ${id}: saved searches ready\n`);
  }

  process.stdout.write(`\nKibana UI: ${KIBANA_URL}\n`);
  process.stdout.write(`Open Discover and pick any "SCAS Detections — Scenario XX" saved search.\n`);
  process.stdout.write(`Created/updated ${metadata.length * 2} saved searches (${createdSearches} new scenario bundles).\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`setup-kibana-data-views failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { ensureDataView, ensureSavedSearch };
