'use strict';

/**
 * Canonical diagram drawing contract for SCAS docs.
 *
 * Markdown cannot render raw `.excalidraw`. Always commit pairs under:
 *   documentation/assets/diagrams/<category>/{svg,excalidraw}/<basename>.*
 *   category ∈ platform | observability | codeflow
 *
 * Generators:
 *   - scripts/diagrams/generate-scenario-observability-diagrams.js
 *   - scripts/diagrams/generate-scenario-codeflow-diagrams.js
 *
 * When editing a diagram: preserve every requiredLabel and edgeIntent below.
 * Do not invent nodes or collapse fan-out/fan-in. Hand-authored docs stay
 * SVG-only (no Mermaid). Scenario observability guides frame the Archify architecture and sequence HTML.
 */

const path = require('path');
const fs = require('fs');
const {
  DIAGRAMS_DIR,
  categoryForBasename,
  diagramAssetPaths,
} = require('./diagram-paths');

/** @typedef {{
 *   basename: string,
 *   category?: 'platform' | 'observability' | 'codeflow',
 *   markdownDoc?: string,
 *   markdownDocs?: string[],
 *   markdownDocGlob?: { dir: string, pattern: string },
 *   generatorMustNotEmitMermaid?: string | string[],
 *   generatorMustEmitMermaidSequence?: string,
 *   requireMermaidSequence?: boolean,
 *   archifyArchitecture?: string,
 *   archifySequence?: string,
 *   archifyWorkflow?: string,
 *   title: string,
 *   purpose: string,
 *   layout: string,
 *   nodes: string[],
 *   edges: string[],
 *   requiredLabels: string[],
 *   forbiddenPatterns: string[],
 *   safetyNotes?: string[],
 * }} DiagramSpec */

const HAND_AUTHORED_SPECS = [
  {
    basename: 'scas-e2e-lab-flow',
    markdownDoc: 'documentation/platform/ARCHITECTURE.md',
    title: 'End-to-end lab flow',
    purpose:
      'Show how a learner moves from repo setup through attack terminals to evidence and Kibana defense.',
    layout: 'Left-to-right swimlanes: Setup | Attack | Evidence | Defense',
    nodes: [
      './scripts/setup/setup.sh',
      'scenarios/NN/setup.sh',
      'Terminal A: mock server',
      'Terminal B: victim app',
      'captured-data.json',
      'scas-detections index',
      'DETECT.md runbook',
      'detection-tools/',
      'Kibana Discover',
    ],
    edges: [
      'setup.sh → scenarios/NN/setup.sh',
      'scenarios/NN/setup.sh → Terminal A mock server',
      'Terminal A mock server → Terminal B victim app',
      'victim app → captured-data.json',
      'victim app → scas-detections index',
      'captured-data.json → Kibana Discover',
      'DETECT.md runbook → Kibana Discover',
      'detection-tools/ → Kibana Discover',
    ],
    requiredLabels: [
      './scripts/setup/setup.sh',
      'scenarios/NN/',
      'mock server',
      'victim app',
      'captured-data.json',
      'scas-detections',
      'DETECT.md',
      'detection-',
      'Kibana Discover',
    ],
    forbiddenPatterns: [],
    safetyNotes: [
      'TESTBENCH_MODE=enabled required for malicious paths',
      'exfil stays on localhost',
    ],
  },
  {
    basename: 'scas-session-tracks',
    markdownDoc: 'documentation/platform/OPERATIONS.md',
    title: 'High-level session flow',
    purpose:
      'Show operator → core mock/capture track, optional ES/Floci sidecars, and blue-team review sink.',
    layout:
      'Columns: Operator | Core track | Optional tracks; Blue-team sink below (DETECT.md + detectors)',
    nodes: [
      'setup.sh + TESTBENCH_MODE',
      'Run victim app / CI sim',
      'Malicious package / build script',
      'Mock server :3000–3023',
      'captured-data.json',
      'Elasticsearch scas-detections',
      'Floci S3/ECR :4566',
      'DETECT.md + detectors',
    ],
    edges: [
      'Setup → RunLab',
      'RunLab → Payload',
      'Payload → Mock',
      'Mock → Capture',
      'Mock -.-> Elasticsearch (label SCAS_ES_URL)',
      'Payload -.-> Floci (label SCAS_FLOCI_ENABLED)',
      'Capture → DETECT.md + detectors',
      'Elasticsearch → DETECT.md + detectors',
      'Floci → DETECT.md + detectors',
    ],
    requiredLabels: [
      'TESTBENCH_MODE',
      'Run victim',
      'Malicious package',
      'Mock server',
      'captured-data.json',
      'Elasticsearch',
      'Floci',
      'SCAS_ES_URL',
      'SCAS_FLOCI_ENABLED',
      'DETECT.md + detectors',
    ],
    forbiddenPatterns: [],
    safetyNotes: ['Simulated exfil targets 127.0.0.1 / localhost only'],
  },
  {
    basename: 'scas-threat-boundaries',
    markdownDoc: 'documentation/platform/ARCHITECTURE.md',
    title: 'Trust boundaries',
    purpose:
      'Show trusted operator controls vs simulated untrusted payload/collectors vs forbidden external C2.',
    layout: 'Three boundary groups L→R: Trusted | Simulated untrusted | Forbidden',
    nodes: [
      'Learner VM / lab machine',
      'SCAS repo + TESTBENCH_MODE',
      'Malicious package / CI script',
      '127.0.0.1 mock collectors',
      '127.0.0.1:4566 Floci',
      'External C2 / real AWS',
    ],
    edges: [
      'SCAS repo + TESTBENCH_MODE → Malicious package / CI script',
      'Malicious package → 127.0.0.1 mock collectors',
      'Malicious package → 127.0.0.1:4566 Floci',
      'Malicious package -.-> must not → External C2 / real AWS',
    ],
    requiredLabels: [
      'Learner VM',
      'TESTBENCH_MODE',
      'operator controls',
      'Malicious package',
      'mock collectors',
      'Floci',
      'External C2',
      'must not',
    ],
    forbiddenPatterns: [],
    safetyNotes: [
      'Payload may talk to localhost mocks/Floci only',
      'Never off-box C2 or real cloud',
    ],
  },
  {
    basename: 'scas-curriculum-stages',
    markdownDoc: 'documentation/learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md',
    title: 'Visual learning flow',
    purpose:
      'Show Stage 0–5 curriculum progression matching Zero-to-Hero stage titles (not CamelCase IDs alone).',
    layout: 'Single horizontal chain Stage 0 → Stage 5',
    nodes: [
      'Stage 0 Foundations',
      'Stage 1 Entry Attacks',
      'Stage 2 Resolution & Integrity Attacks',
      'Stage 3 Pipeline & Infrastructure',
      'Stage 4 Advanced Attack Chains',
      'Stage 5 Capstone Defense-in-Depth',
    ],
    edges: [
      'Stage 0 → Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5',
    ],
    requiredLabels: [
      'Stage 0',
      'Stage 1',
      'Stage 2',
      'Stage 3',
      'Stage 4',
      'Stage 5',
      'Foundations',
      'Entry Attacks',
      'Integrity',
      'Pipeline',
      'Advanced',
      'Defense-in-Depth',
    ],
    forbiddenPatterns: [],
  },
  {
    basename: 'scas-scenario-17-stage-chain',
    markdownDoc:
      'documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_17.md',
    title: 'Scenario 17 — stage dependencies',
    purpose:
      'Show multi-stage chain: stage1-access-lib → stage2-compromised-lib → replication; each stage posts capture to mock :3017.',
    layout: 'Horizontal stage chain above; Mock server :3017 sink below with capture edges from each stage',
    nodes: [
      'Stage 1: stage1-access-lib',
      'Stage 2: stage2-compromised-lib',
      'Stage 3: replication spread.json',
      'Mock server :3017',
    ],
    edges: [
      'Stage 1 → Stage 2 (writes .stolen/token.json)',
      'Stage 2 → Stage 3 (reads token)',
      'Stage 1 → Mock (capture stage1)',
      'Stage 2 → Mock (capture stage2)',
      'Stage 3 → Mock (capture stage3)',
    ],
    requiredLabels: [
      'Stage 1',
      'stage1-access-lib',
      'Stage 2',
      'stage2-compromised-lib',
      'Stage 3',
      'spread.json',
      'Mock server :3017',
      '.stolen/token.json',
      'reads token',
      'capture stage1',
      'capture stage2',
      'capture stage3',
    ],
    forbiddenPatterns: [],
    safetyNotes: ['Localhost-only captures on :3017'],
  },
];

function loadObservabilityMeta() {
  const metaPath = path.join(__dirname, '../../detection-tools/es/scenario-observability.json');
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

/** One unique observability Excalidraw/SVG pair per scenario. */
function buildScenarioObservabilitySpecs() {
  const meta = loadObservabilityMeta();
  return meta.map((scenario, index) => {
    const id = scenario.scenario_id;
    /** @type {DiagramSpec} */
    const spec = {
      basename: `scas-observability-scenario-${id}`,
      category: 'observability',
      markdownDoc: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_${id}.md`,
      title: `Scenario ${id} observability flow`,
      purpose: `Unique Phase 1–5 observability diagram for Scenario ${id} (${scenario.title}), including scenario-specific Phase-2 attack steps. The zero-to-hero End-to-end flow embeds the Archify architecture HTML instead of this SVG.`,
      archifyArchitecture: `.archify/scenarios/${scenario.folder}/architecture/sc${scenario.folder}-architecture.html`,
      archifySequence: `.archify/scenarios/${scenario.folder}/sequence/sc${scenario.folder}-sequence.html`,
      layout:
        'Title + actors row; Phase 1 collectors; Phase 2 numbered scenario steps; Phase 3–5 exfil / optional ES / Kibana',
      nodes: [
        'Learner (you)',
        scenario.victim_label,
        scenario.malicious_label,
        scenario.mock_label,
        'Elasticsearch :9200',
        'Kibana :5601',
        'Phase 1 — Collectors',
        'Phase 2 — Lab execution',
        'Phase 3 — Exfil',
        'Phase 4 — Optional ES',
        'Phase 5 — Kibana',
      ],
      edges: [
        'Phase 1 → Phase 2 → Phase 3',
        'Phase 3 -.-> Phase 4 when SCAS_ES_URL set',
        'Phase 4 → Phase 5',
        `MalPkg → Mock (${scenario.mock_endpoint})`,
      ],
      requiredLabels: [
        `Scenario ${id}`,
        'Learner (you)',
        'Phase 1',
        'Phase 2',
        'Phase 3',
        'Phase 4',
        'Phase 5',
        'TESTBENCH_MODE',
        'SCAS_ES_URL',
        'scas-detections',
        'SCAS Detections',
        'SCAS Rules',
        '127.0.0.1',
        scenario.mock_endpoint,
      ],
      forbiddenPatterns: [],
      safetyNotes: [
        'localhost/127.0.0.1 only',
        'TESTBENCH_MODE=enabled for malicious paths',
      ],
    };
    if (index === 0) {
      spec.generatorMustNotEmitMermaid = [
        'scripts/diagrams/generate-scenario-observability-diagrams.js',
        'scripts/docs/generate-substack-posts.js',
      ];
      spec.generatorMustEmitMermaidSequence = 'detection-tools/es/generate-observability-section.js';
    }
    spec.requireMermaidSequence = true;
    return spec;
  });
}

/** One unique codeflow Excalidraw/SVG pair per scenario (SVG-only embeds). */
function buildScenarioCodeflowSpecs() {
  const meta = loadObservabilityMeta();
  return meta.map((scenario) => {
    const id = scenario.scenario_id;
    /** @type {DiagramSpec} */
    return {
      basename: `scas-codeflow-scenario-${id}`,
      category: 'codeflow',
      markdownDoc: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_${id}.md`,
      archifyWorkflow: `.archify/scenarios/${scenario.folder}/workflow/sc${scenario.folder}-workflow.html`,
      title: `Scenario ${id} — code-level workflow`,
      purpose: `Low-level runtime/code workflow for Scenario ${id} (${scenario.title}): deception surface, payload path, TESTBENCH gate, mock capture, verify.`,
      layout:
        'Stacked panels: identity/deception, payload vs cover surface, setup + terminals, require/runtime gate + exfil, verify + safety',
      nodes: [
        scenario.malicious_label,
        scenario.victim_label,
        scenario.mock_label,
        'setup.sh + TESTBENCH_MODE',
        scenario.trigger_action,
        scenario.mock_endpoint,
        'captured evidence',
        'verify CLI',
      ],
      edges: [
        'setup → mock collector',
        'setup → victim lab run',
        'victim → malicious payload',
        'payload → TESTBENCH_MODE gate',
        `gate yes → Mock ${scenario.mock_endpoint}`,
        'gate no → [SAFE MODE]',
        'payload -.-> Floci (SCAS_FLOCI_ENABLED)',
        'learner → verify evidence',
      ],
      requiredLabels: [
        `Scenario ${id}`,
        'TESTBENCH_MODE',
        '[SAFE MODE]',
        'localhost',
        scenario.mock_endpoint.split(/\s+/).pop() || '/collect',
        'SCAS_FLOCI_ENABLED',
        'setup.sh',
        'curl',
      ],
      forbiddenPatterns: [],
      safetyNotes: [
        'TESTBENCH_MODE=enabled required for malicious paths',
        'Exfil targets localhost / 127.0.0.1 only',
      ],
    };
  });
}

/** @type {DiagramSpec[]} */
const DIAGRAM_SPECS = [
  ...HAND_AUTHORED_SPECS.map((s) => ({ ...s, category: s.category || 'platform' })),
  ...buildScenarioObservabilitySpecs(),
  ...buildScenarioCodeflowSpecs(),
];

/** Drawing rules every author / agent must follow. */
const DRAWING_RULES = [
  'Embed SVG in Markdown with ![alt](relative/path/to/category/svg/basename.svg) — never paste .excalidraw JSON into Markdown.',
  'Keep pairs under documentation/assets/diagrams/<platform|observability|codeflow>/{svg,excalidraw}/.',
  'Preserve every edge in DIAGRAM_SPECS[*].edges — do not collapse fan-out or fan-in.',
  'Preserve every requiredLabels needle in the SVG text content.',
  'Hand-authored platform/curriculum diagrams: do not reintroduce ```mermaid in their markdownDoc paths — SVG only.',
  'Scenario observability (zero-to-hero): End-to-end flow iframes the Archify architecture HTML, and Sequence diagram (Phase 1-5) iframes the Archify sequence HTML, with the viewer toolbar left on. Do not add ?embed=1. Do not put the SVG swimlane or a Mermaid sequence back in those slots. Keep the Excalidraw/SVG swimlane on disk.',
  'Scenario codeflow (zero-to-hero): ## Code-level workflow iframes the Archify workflow HTML (archify/scenarios/NN-slug/workflow/scNN-slug-workflow.html) with the viewer toolbar left on. Do not add ?embed=1. Keep the Excalidraw/SVG pair on disk; do not put that SVG back in the section.',
  'Archify exports: after finalize replaces a scenario HTML file, run node scripts/diagrams/stamp-archify-export-copyright.js so PNG, SVG, and the other exports carry © Raja Nagori · SCAS.',
  'SVG must be well-formed XML: escape & as &amp;, < as &lt;, > as &gt; inside text nodes.',
  'Prefer sparse labels, clear reading order, and edge labels for dashed optional paths (SCAS_ES_URL, SCAS_FLOCI_ENABLED, must not).',
  'Safety captions (TESTBENCH_MODE, localhost) are allowed as footnotes; do not invent new attack capabilities.',
  'Zero-to-hero: regenerate with scripts/diagrams/generate-scenario-observability-diagrams.js and scripts/diagrams/generate-scenario-codeflow-diagrams.js; inject observability section with detection-tools/es/generate-observability-section.js.',
  'Observability SVG layout (Phases 1–5): header + 6-actor strip; Phase 1 Terminal A commands; Phase 2 numbered steps with ≥40px shafts; "then" / SCAS_ES_URL pills in gutters with correct z-order; Phase 3–5 gutters ≥100px; Verify footer; arrowheads markerUnits="userSpaceOnUse" ≤12px.',
];

module.exports = {
  DIAGRAM_SPECS,
  DRAWING_RULES,
  DIAGRAMS_DIR,
  HAND_AUTHORED_SPECS,
  buildScenarioObservabilitySpecs,
  buildScenarioCodeflowSpecs,
  categoryForBasename,
  diagramAssetPaths,
};
