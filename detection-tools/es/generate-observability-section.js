const fs = require('fs');
const path = require('path');
const { SCENARIO_DIAGRAMS } = require('./scenario-diagram-steps');

const metadata = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'scenario-observability.json'), 'utf8')
);

/** Per-scenario Excalidraw SVG (unique Phase 2 + shared phase frame). */
function observabilityBasename(scenarioId) {
  return `scas-observability-scenario-${scenarioId}`;
}

function observabilityRel(scenarioId) {
  const base = observabilityBasename(scenarioId);
  return `../../assets/diagrams/observability/svg/${base}.svg`;
}

function observabilitySourceRel(scenarioId) {
  const base = observabilityBasename(scenarioId);
  return `../../assets/diagrams/observability/excalidraw/${base}.excalidraw`;
}

function shortLabel(label) {
  return String(label).split(' (')[0].trim();
}

function captureFileHint(scenario) {
  const ep = scenario.mock_endpoint || 'POST /collect';
  if (/beacon/i.test(ep)) return 'captured beacon JSON';
  if (/credential/i.test(scenario.mock_label || '')) return 'captured-credentials.json';
  return scenario.capture_file || 'captured-data.json';
}

function escapeMdCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Unique per-scenario Excalidraw→SVG embed.
 * Assets from: node scripts/diagrams/generate-scenario-observability-diagrams.js
 */
function buildSvgDiagram(scenario) {
  const id = scenario.scenario_id;
  const base = observabilityBasename(id);
  return [
    `![Scenario ${id} observability flow: Phase 1 collectors → Phase 2 lab steps → Phase 3 localhost exfil → optional Elasticsearch → Kibana Detections and Rules](${observabilityRel(id)})`,
    '',
    `*Swimlane diagram for Scenario ${id}. Editable source: [\`${base}.excalidraw\`](${observabilitySourceRel(id)}). Regenerate with \`node scripts/diagrams/generate-scenario-observability-diagrams.js\`.*`,
  ].join('\n');
}

/**
 * Per-scenario Mermaid sequenceDiagram (Phase 1-5) - kept alongside the SVG
 * so guide.html can expand/lightbox the interaction sequence.
 */
function buildSequenceDiagram(scenario) {
  const id = scenario.scenario_id;
  const captureFile = captureFileHint(scenario);
  const diagramMeta = SCENARIO_DIAGRAMS[id] || {
    attack_steps: [{ from: 'Learner', to: 'Victim', message: scenario.trigger_action }],
  };

  const lines = [
    '```mermaid',
    'sequenceDiagram',
    '    autonumber',
    '    participant Learner as Learner (you)',
    `    participant Victim as ${shortLabel(scenario.victim_label)}`,
    `    participant MalPkg as ${scenario.malicious_label}`,
    `    participant Mock as ${scenario.mock_label}`,
    '    participant ES as Elasticsearch :9200',
    '    participant Kibana as Kibana :5601',
    '',
    '    Note over Learner,Mock: Phase 1 - Start collectors (Terminal A)',
    '    Learner->>Mock: export TESTBENCH_MODE=enabled',
    '    Learner->>Mock: export SCAS_ES_URL=http://localhost:9200 (optional)',
    `    Learner->>Mock: ${scenario.mock_start}`,
    '    Mock->>Mock: Listen for exfil POST on localhost',
    '',
    '    Note over Learner,MalPkg: Phase 2 - Run the lab (Terminal B)',
    '    Learner->>Learner: export TESTBENCH_MODE=enabled',
    '    Learner->>Learner: export SCAS_ES_URL=http://localhost:9200 (optional)',
  ];

  for (const step of diagramMeta.attack_steps) {
    lines.push(`    ${step.from}->>${step.to}: ${step.message}`);
  }

  lines.push(
    '',
    '    Note over MalPkg,Mock: Phase 3 - Simulated exfiltration (127.0.0.1 only)',
    '    Note over MalPkg: Malicious path gated by TESTBENCH_MODE=enabled',
    `    MalPkg->>Mock: ${scenario.mock_endpoint} JSON payload`,
    `    Mock->>Mock: Append to infrastructure/${captureFile}`,
    '    Mock-->>Learner: 200 OK (capture accepted)',
    '',
    '    Note over Mock,Kibana: Phase 4 - Optional Elasticsearch indexing',
    '    alt SCAS_ES_URL is set in Terminal A',
    `    Mock->>ES: POST scas-detections (scenario_id=${id}, event_type=exfil_capture)`,
    '    ES->>ES: Store @timestamp, package, detail fields',
    '    else SCAS_ES_URL not set',
    '    Mock->>Mock: File-only capture (default lab behavior)',
    '    end',
    '',
    '    Note over ES: Runbook pre-seeded at scas-rules/_doc/' + id,
    '    Note over Learner,Kibana: Phase 5 - Blue-team review in Kibana',
    `    Learner->>Kibana: Open Discover → SCAS Detections - Scenario ${id}`,
    '    Kibana->>ES: Query scenario_id + sort by @timestamp desc',
    '    ES-->>Kibana: Return capture events for this lab',
    `    Learner->>Kibana: Open SCAS Rules - Scenario ${id}`,
    '    ES-->>Kibana: Return IOCs, Sigma, YARA from DETECT.md',
    '    Learner->>Learner: Correlate capture detail with runbook IOCs',
    '```'
  );

  return lines.join('\n');
}

/** SVG swimlane + Mermaid sequence - both required for scenario guides. */
function buildDiagram(scenario) {
  return [
    buildSvgDiagram(scenario),
    '',
    '### Sequence diagram (Phase 1-5)',
    '',
    'Same flow as a participant sequence (expandable in the docs hub).',
    '',
    buildSequenceDiagram(scenario),
  ].join('\n');
}

function buildAttackStepsTable(scenario) {
  const id = scenario.scenario_id;
  const diagramMeta = SCENARIO_DIAGRAMS[id] || {
    attack_steps: [{ from: 'Learner', to: 'Victim', message: scenario.trigger_action }],
  };
  const rows = diagramMeta.attack_steps.map((step, i) => {
    return `| ${i + 1} | ${escapeMdCell(step.from)} | ${escapeMdCell(step.to)} | ${escapeMdCell(step.message)} |`;
  });
  return [
    '### Scenario-specific attack steps (Phase 2)',
    '',
    'Same Phase-2 path as the diagrams above (for skimming / accessibility).',
    '',
    '| # | From | To | Action |',
    '|---|------|----|--------|',
    ...rows,
    '',
  ].join('\n');
}

function buildDiagramLegend() {
  return [
    '### How to read this diagram',
    '',
    '| Phase | What you should look for |',
    '|-------|--------------------------|',
    '| **1 - Collectors** | Terminal A starts the mock server (or harvester). Set `SCAS_ES_URL` here if you want live Elasticsearch indexing. |',
    '| **2 - Lab execution** | Terminal B runs the scenario README steps. See the **sequence diagram** and **Scenario-specific attack steps** below. |',
    '| **3 - Exfiltration** | Malicious sample sends **localhost-only** JSON to the mock endpoint. Evidence is always written to `infrastructure/` on disk. |',
    '| **4 - Elasticsearch** | When `SCAS_ES_URL` is set, the same capture is indexed into `scas-detections` with `scenario_id` and `event_type=exfil_capture`. |',
    '| **5 - Kibana** | Use the per-scenario saved searches to compare **runtime captures** (Detections) with the **static runbook** (Rules). |',
    '',
    '> **Safety:** All network calls stay on `127.0.0.1`. Malicious logic runs only when `TESTBENCH_MODE=enabled`.',
    '',
  ].join('\n');
}

function buildSection(scenario) {
  const id = scenario.scenario_id;
  const diagramMeta = SCENARIO_DIAGRAMS[id];
  const intro = diagramMeta ? diagramMeta.intro : `Scenario ${id} capture and observability flow.`;

  const lines = [
    '---',
    '',
    '## Elasticsearch + Kibana observability (optional)',
    '',
    `Scenario **${id} - ${scenario.title}** is indexed in Elasticsearch when the observability stack is running.`,
    '',
    intro,
    '',
    '- **Detection runbook (static)** → index `scas-rules`, document id `' + id + '` - IOCs, Sigma, YARA, sample logs from `DETECT.md`',
    '- **Runtime captures (dynamic)** → index `scas-detections` - one document per exfil event when `SCAS_ES_URL` is set before starting the mock collector',
    '',
    buildDiagramLegend(),
    '### End-to-end flow',
    '',
    buildDiagram(scenario),
    '',
    buildAttackStepsTable(scenario),
    '### Prerequisites',
    '',
    'From the repository root:',
    '',
    '```bash',
    './scripts/observability/elasticsearch-up.sh',
    './scripts/observability/setup-kibana-data-views.sh   # data views + saved searches for all 25 scenarios',
    '```',
    '',
    '### Run this scenario with live Elasticsearch forwarding',
    '',
    '**Terminal A - mock collector** (from `scenarios/' + scenario.folder + '`):',
    '',
    '```bash',
    'cd scenarios/' + scenario.folder,
    'export TESTBENCH_MODE=enabled',
    'export SCAS_ES_URL=http://localhost:9200',
    scenario.mock_start,
    '```',
    '',
    '**Terminal B - execute the lab:**',
    '',
    '```bash',
    'cd scenarios/' + scenario.folder,
    'export TESTBENCH_MODE=enabled',
    'export SCAS_ES_URL=http://localhost:9200',
    scenario.lab_run,
    '```',
    '',
  ];

  if (scenario.notes) {
    lines.push('> **Note:** ' + scenario.notes, '');
  }

  lines.push(
    '### Verify locally (file-based evidence)',
    '',
    '```bash',
    scenario.verify_cli,
    '```',
    '',
    '### Verify in Elasticsearch (API)',
    '',
    '```bash',
    '# Static runbook for this scenario',
    'curl -s "http://localhost:9200/scas-rules/_doc/' + id + '?pretty"',
    '',
    '# Latest runtime capture events',
    'curl -s "http://localhost:9200/scas-detections/_search?pretty" \\',
    "  -H 'Content-Type: application/json' \\",
    "  -d '{",
    '    "query": { "term": { "scenario_id": "' + id + '" } },',
    '    "sort": [{ "@timestamp": "desc" }],',
    '    "size": 5',
    "  }'",
    '```',
    '',
    '### Verify in Kibana (UI)',
    '',
    '1. Open [http://localhost:5601](http://localhost:5601)',
    '2. **Discover** → **SCAS Detections - Scenario ' + id + '** - live capture timeline (`@timestamp`, `package.name`, `detail`)',
    '3. **Discover** → **SCAS Rules - Scenario ' + id + '** - compare against `iocs`, `sigma`, and `yara` fields',
    '4. Ask: *Does each capture field match an IOC or Sigma condition in the runbook?*',
    '',
    'See [observability/README.md](../../../observability/README.md) for stack details.',
    ''
  );

  return lines.join('\n');
}

function findInsertIndex(lines) {
  const anchors = [
    /^## Part \d+: Clean Up/m,
    /^## Part \d+: Key Takeaways/m,
    /^## 🆘 Troubleshooting/m,
    /^## 📚 Additional Resources/m,
    /^## ⚠️ Important Reminders/m,
    /^## ⚠️ Safety & Ethics/m,
    /^## 🎉 Congratulations!/m
  ];

  let best = lines.length;
  for (const anchor of anchors) {
    const match = lines.findIndex((line) => anchor.test(line));
    if (match !== -1 && match < best) {
      best = match;
    }
  }
  return best;
}

const OBS_HEADING_RE =
  /^## Elasticsearch \+ Kibana observability \(optional\)\s*$/m;

/**
 * Remove every observability section (with or without leading ---).
 * Previous injectors could leave a bare copy AND a --- wrapped copy, so
 * replace-one-match logic stacked duplicates across regenerations.
 */
function stripObservabilitySections(content) {
  // Match optional --- rules (with blank lines) + the full section until the next
  // non-observability H2 (or EOF). Must allow \n between --- and the heading -
  // otherwise a leftover --- stacks on every regeneration.
  const blockRe =
    /(?:^|\n)(?:---\s*\n+)*## Elasticsearch \+ Kibana observability \(optional\)\s*\n[\s\S]*?(?=\n## (?!Elasticsearch \+ Kibana observability)|\s*$)/g;

  let next = content.replace(blockRe, '\n');
  next = next.replace(/\n---\n(?:\s*\n---\n)+/g, '\n---\n');
  next = next.replace(/\n{3,}/g, '\n\n');
  return next;
}

function patchGuide(guidePath, section) {
  if (!fs.existsSync(guidePath)) {
    return { status: 'missing', path: guidePath };
  }

  let content = fs.readFileSync(guidePath, 'utf8');
  const hadSection = OBS_HEADING_RE.test(content);
  content = stripObservabilitySections(content);

  // buildSection already starts with ---\n\n## ... - do not wrap it again.
  const block = `${section.trim()}\n`;
  const lines = content.replace(/\s*$/, '\n').split('\n');
  const insertAt = findInsertIndex(lines);
  lines.splice(insertAt, 0, ...block.split('\n'), '');
  content = lines.join('\n');
  content = content.replace(/\n---\n(?:\s*\n---\n)+/g, '\n---\n');
  content = content.replace(/\n{3,}/g, '\n\n');
  if (!content.endsWith('\n')) content += '\n';

  fs.writeFileSync(guidePath, content);
  return { status: hadSection ? 'updated' : 'patched', path: guidePath };
}

function main() {
  const repoRoot = path.resolve(__dirname, '../..');
  const guideDir = path.join(repoRoot, 'documentation/scenario-guides/zero-to-hero');
  const results = [];

  for (const scenario of metadata) {
    const section = buildSection(scenario);
    const guidePath = path.join(guideDir, `ZERO_TO_HERO_SCENARIO_${scenario.scenario_id}.md`);
    results.push({ scenario_id: scenario.scenario_id, ...patchGuide(guidePath, section) });
  }

  for (const result of results) {
    process.stdout.write(`${result.scenario_id}: ${result.status} (${path.basename(result.path)})\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildSection,
  buildDiagram,
  buildSvgDiagram,
  buildSequenceDiagram,
  buildAttackStepsTable,
  buildDiagramLegend,
  metadata,
  observabilityBasename,
  observabilityRel,
};
