const fs = require('fs');
const path = require('path');
const { SCENARIO_DIAGRAMS } = require('./scenario-diagram-steps');

const metadata = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'scenario-observability.json'), 'utf8')
);

/** Per-scenario Excalidraw SVG (still generated; not the guide embed). */
function observabilityBasename(scenarioId) {
  return `scas-observability-scenario-${scenarioId}`;
}

function observabilityRel(scenarioId) {
  const base = observabilityBasename(scenarioId);
  return `../../assets/diagrams/observability/svg/${base}.svg`;
}

/** Repo-relative Archify HTML for this lab. kind is `architecture` or `sequence`. */
function archifyFilePath(scenario, kind) {
  const file = `sc${scenario.folder}-${kind}.html`;
  return `.archify/scenarios/${scenario.folder}/${kind}/${file}`;
}

function architectureHtmlPath(scenario) {
  return archifyFilePath(scenario, 'architecture');
}

function sequenceHtmlPath(scenario) {
  return archifyFilePath(scenario, 'sequence');
}

/**
 * Path guide.html can iframe. Resolved against /guide.html, so this lands on
 * /archify/... which materialize-docs-for-pages.sh publishes from .archify/.
 */
function architectureSitePath(scenario) {
  return archifyFilePath(scenario, 'architecture').replace(/^\.archify\//, 'archify/');
}

function sequenceSitePath(scenario) {
  return archifyFilePath(scenario, 'sequence').replace(/^\.archify\//, 'archify/');
}

function buildArchifyFrame(scenario, kind, title, lead) {
  const repoPath = archifyFilePath(scenario, kind);
  const sitePath = repoPath.replace(/^\.archify\//, 'archify/');
  const github = `https://github.com/RAJANAGORI/supply-chain-attack-simulator/blob/main/${repoPath}`;
  return [
    `<iframe class="archify-embed" title="${title}" src="${sitePath}" loading="lazy"></iframe>`,
    '',
    `<p class="archify-embed-caption">${lead} <a href="${sitePath}" target="_blank" rel="noopener noreferrer">Open the full diagram</a>, or the <a href="${github}" target="_blank" rel="noopener noreferrer">HTML source on GitHub</a>.</p>`,
  ].join('\n');
}

function escapeMdCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * End-to-end slot: the Archify architecture HTML, framed in the docs reader.
 * guide.html allows raw HTML. GitHub's blob page will not render inside a frame,
 * so the src is the copy published at /archify/... (see pages materialize).
 */
function buildArchitectureEmbed(scenario) {
  const id = scenario.scenario_id;
  return buildArchifyFrame(
    scenario,
    'architecture',
    `Scenario ${id} lab architecture`,
    `Lab topology for Scenario ${id} (localhost only, TESTBENCH_MODE=enabled on the payload).`
  );
}

/** @deprecated alias; the guide embed is the Archify page, not the SVG swimlane. */
function buildSvgDiagram(scenario) {
  return buildArchitectureEmbed(scenario);
}

/** Phase 1-5 slot: the Archify sequence HTML, framed the same way as the architecture page. */
function buildSequenceDiagram(scenario) {
  const id = scenario.scenario_id;
  return buildArchifyFrame(
    scenario,
    'sequence',
    `Scenario ${id} attack sequence`,
    `Phase 1-5 attack sequence for Scenario ${id}. Collectors, the lab run, localhost exfil, then optional Elasticsearch and Kibana.`
  );
}

/** Archify architecture frame, then the Archify sequence frame. */
function buildDiagram(scenario) {
  return [
    buildArchitectureEmbed(scenario),
    '',
    '### Sequence diagram (Phase 1-5)',
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
  buildArchitectureEmbed,
  buildSvgDiagram,
  architectureHtmlPath,
  architectureSitePath,
  sequenceHtmlPath,
  sequenceSitePath,
  buildSequenceDiagram,
  buildAttackStepsTable,
  buildDiagramLegend,
  metadata,
  observabilityBasename,
  observabilityRel,
};
