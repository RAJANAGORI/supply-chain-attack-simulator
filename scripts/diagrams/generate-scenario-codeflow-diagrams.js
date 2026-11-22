#!/usr/bin/env node
'use strict';

/**
 * Generate per-scenario code-level workflow diagrams (SVG + Excalidraw).
 *
 *   node scripts/diagrams/generate-scenario-codeflow-diagrams.js
 *
 * Reads:
 *   detection-tools/es/scenario-observability.json
 *   detection-tools/es/scenario-diagram-steps.js
 *   scripts/lib/diagram-paths.js
 *   scripts/lib/scenario-codeflow-detail.js
 *
 * Writes (for each scenario 01–23):
 *   documentation/assets/diagrams/codeflow/svg/scas-codeflow-scenario-NN.svg
 *   documentation/assets/diagrams/codeflow/excalidraw/scas-codeflow-scenario-NN.excalidraw
 *
 * Optionally injects a ## Code-level workflow section into each zero-to-hero guide.
 *
 * All scenarios share one dense Panel A–E layout (parameterized from DETAIL[id]).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const { SCENARIO_DIAGRAMS } = require('../../detection-tools/es/scenario-diagram-steps');
const { diagramAssetPaths } = require('../lib/diagram-paths');
const { DETAIL } = require('../lib/scenario-codeflow-detail');

const META = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'detection-tools/es/scenario-observability.json'), 'utf8')
);

const OBS_MARKER = '## Elasticsearch + Kibana observability (optional)';
const CODE_MARKER = '## Code-level workflow';
const REGEN_CMD = 'node scripts/diagrams/generate-scenario-codeflow-diagrams.js';

const C = {
  ink: '#0f172a',
  muted: '#64748b',
  line: '#334155',
  white: '#ffffff',
  panel: '#f8fafc',
  panelStroke: '#cbd5e1',
  legit: { fill: '#dbeafe', stroke: '#2563eb', soft: '#eff6ff' },
  mal: { fill: '#fee2e2', stroke: '#dc2626', soft: '#fef2f2' },
  victim: { fill: '#ffedd5', stroke: '#ea580c', soft: '#fff7ed' },
  mock: { fill: '#dcfce7', stroke: '#16a34a', soft: '#f0fdf4' },
  gate: { fill: '#fef3c7', stroke: '#d97706', soft: '#fffbeb' },
  floci: { fill: '#e0e7ff', stroke: '#4338ca', soft: '#eef2ff' },
  setup: { fill: '#e2e8f0', stroke: '#475569', soft: '#f1f5f9' },
  code: { fill: '#0f172a', soft: '#1e293b', muted: '#94a3b8' },
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function portFromMock(mockLabel) {
  const m = String(mockLabel).match(/:(\d{4})/);
  return m ? m[1] : '3000';
}

function endpointPathToken(mockEndpoint) {
  const parts = String(mockEndpoint || 'POST /collect').trim().split(/\s+/);
  return parts[parts.length - 1] || '/collect';
}

/** Prefer host from DETAIL.triggerStrip (localhost vs 127.0.0.1) over a hard-coded label. */
function exfilHostFromDetail(d) {
  const m = String(d.triggerStrip || '').match(/POST\s+(localhost|127\.0\.0\.1):/);
  return (m && m[1]) || d.exfilHost || 'localhost';
}

function captureFileLabel(captureFile) {
  const s = String(captureFile || 'infrastructure/captured-data.json');
  if (s.length <= 34) return s;
  // Prefer keeping the basename readable when truncating long paths.
  const base = s.split('/').pop();
  if (base && base.length <= 28) return `…/${base}`;
  return `${s.slice(0, 33)}…`;
}

function captureHint(scenario) {
  if (scenario.capture_file) return `infrastructure/${scenario.capture_file}`;
  const ep = scenario.mock_endpoint || 'POST /collect';
  if (/beacon/i.test(ep)) return 'infrastructure/ captured beacon JSON';
  if (/credential/i.test(scenario.mock_label || '')) return 'captured-credentials.json';
  return 'infrastructure/captured-data.json';
}

function uid(prefix, n) {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

function baseEl(extra) {
  return {
    angle: 0,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...extra,
  };
}

function makeRect(id, x, y, w, h, stroke, fill) {
  return baseEl({
    type: 'rectangle',
    id,
    x,
    y,
    width: w,
    height: h,
    strokeColor: stroke,
    backgroundColor: fill,
  });
}

function makeText(id, x, y, w, h, text, opts = {}) {
  return baseEl({
    type: 'text',
    id,
    x,
    y,
    width: w,
    height: h,
    strokeColor: opts.strokeColor || C.ink,
    backgroundColor: 'transparent',
    strokeWidth: 1,
    roundness: null,
    text,
    fontSize: opts.fontSize || 14,
    fontFamily: 1,
    textAlign: opts.textAlign || 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: text,
    lineHeight: 1.25,
    autoResize: true,
  });
}

function makeArrow(id, x, y, points, opts = {}) {
  const end = points[points.length - 1];
  return baseEl({
    type: 'arrow',
    id,
    x,
    y,
    width: end[0],
    height: end[1],
    strokeColor: opts.strokeColor || C.line,
    backgroundColor: 'transparent',
    strokeStyle: opts.dashed ? 'dashed' : 'solid',
    roundness: { type: 2 },
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'arrow',
  });
}

/** Compact Excalidraw mirror — still names the dense Panel A–E narrative. */
function buildExcalidraw(scenario, diagramMeta, d) {
  const id = scenario.scenario_id;
  const steps = diagramMeta.attack_steps || [];
  const epToken = d.endpointPath || endpointPathToken(scenario.mock_endpoint);
  const port = d.mockPort || portFromMock(scenario.mock_label);
  const host = exfilHostFromDetail(d);
  const elements = [];
  let n = 0;
  const next = (k) => uid(`${k}${id}`, ++n);

  const stepLine = steps
    .map((s, i) => `${i + 1}. ${s.from}→${s.to}: ${s.message}`)
    .join(' · ')
    .slice(0, 420);

  const blocks = [
    {
      y: 16,
      title: `Scenario ${id} — code-level ${d.title} workflow (detailed / dense)`,
      body: [
        d.deceptionPill,
        d.triggerStrip,
        `TESTBENCH_MODE · [SAFE MODE] · ${host}:${port}${epToken} · SCAS_FLOCI_ENABLED · setup.sh · curl`,
      ].join('\n'),
    },
    {
      y: 110,
      title: 'A — Package / identity (dense compare)',
      body: [
        `${d.intended.title}: ${d.intended.path}`,
        `${d.malicious.title}: ${d.malicious.path}`,
        (d.compareRows || [])
          .map((r) => `${r[0]}: ${r[1]} vs ${r[2]}`)
          .join(' · ')
          .slice(0, 500),
        `${d.victimDep.label}: ${d.victimDep.lines.join(' ')}`,
      ].join('\n'),
    },
    {
      y: 260,
      title: 'B — Side-by-side code surfaces (not a thin step list)',
      body: [
        `LEGIT: ${d.legitCode.title}`,
        d.legitCode.lines.slice(0, 4).join(' · '),
        `MAL: ${d.malCode.title}`,
        d.malCode.lines.slice(0, 5).join(' · '),
        `edge: ${d.codeEdgePill}`,
      ].join('\n'),
    },
    {
      y: 410,
      title: 'C — setup.sh + Terminal A/B (+ compact attack steps)',
      body: [
        `setup: ${d.setupLines.join(' → ')}`,
        `mock: ${d.mockLines.join(' · ')}`,
        `lab: ${d.labLines.join(' · ')}`,
        stepLine ? `steps: ${stepLine}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
    {
      y: 560,
      title: 'D — Runtime gate + payload + mock + Floci + cover',
      body: [
        `${d.runtime.victimBox.join(' / ')} → ${d.runtime.malBox.join(' / ')}`,
        "TESTBENCH_MODE === 'enabled'? → continue else [SAFE MODE]",
        d.runtime.payloadTitle,
        d.runtime.payloadLines.slice(0, 4).join(' · '),
        `${d.runtime.mockTitle} · SCAS_FLOCI_ENABLED → uploadJson('${id}',…)`,
        d.runtime.coverTitle,
      ].join('\n'),
    },
    {
      y: 720,
      title: 'E — Verify + red flags + safety',
      body: [
        d.verifyLines.filter(Boolean).slice(0, 3).join(' · '),
        d.redFlags.slice(0, 4).join(' · '),
        d.safetyLines.slice(0, 3).join(' · '),
      ].join('\n'),
    },
  ];

  for (const b of blocks) {
    elements.push(makeText(next('t'), 24, b.y, 1400, 24, b.title, { fontSize: 16 }));
    elements.push(
      makeText(next('t'), 24, b.y + 28, 1400, 100, b.body, {
        fontSize: 12,
        strokeColor: C.muted,
      })
    );
  }
  elements.push(makeRect(next('r'), 24, 860, 220, 50, C.legit.stroke, C.legit.fill));
  elements.push(makeRect(next('r'), 280, 860, 220, 50, C.mal.stroke, C.mal.fill));
  elements.push(makeRect(next('r'), 536, 860, 220, 50, C.mock.stroke, C.mock.fill));
  elements.push(makeRect(next('r'), 792, 860, 220, 50, C.gate.stroke, C.gate.fill));
  elements.push(makeArrow(next('a'), 244, 885, [[0, 0], [36, 0]]));
  elements.push(makeArrow(next('a'), 500, 885, [[0, 0], [36, 0]]));
  elements.push(makeArrow(next('a'), 756, 885, [[0, 0], [36, 0]]));

  return {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements,
    appState: { gridSize: null, viewBackgroundColor: C.white },
    files: {},
  };
}

/** Shared SVG helpers factory. */
function svgHelpers() {
  const box = (x, y, w, h, fill, stroke, rx = 8) =>
    `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" filter="url(#soft)"/>`;

  const label = (x, y, text, opts = {}) => {
    const size = opts.size || 13;
    const anchor = opts.anchor || 'start';
    const weight = opts.weight || 600;
    const fill = opts.fill || C.ink;
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;
  };

  const multi = (x, y, lines, opts = {}) => {
    const size = opts.size || 12;
    const leading = opts.leading || 16;
    const fill = opts.fill || C.ink;
    const weight = opts.weight || 500;
    const family = opts.mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : undefined;
    const font = family ? ` font-family="${family}"` : '';
    return lines
      .map(
        (line, i) =>
          `<text${font} x="${x}" y="${y + i * leading}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`
      )
      .join('\n');
  };

  const arrow = (x1, y1, x2, y2, opts = {}) => {
    const dashed = opts.dashed ? ' stroke-dasharray="7 5"' : '';
    const color = opts.color || C.line;
    const width = opts.width || 2.75;
    const marker = opts.noMarker ? '' : ` marker-end="url(${opts.marker || '#arrowhead'})"`;
    return `<path class="arrow" d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="${width}"${dashed}${marker}/>`;
  };

  const edgePill = (cx, cy, text, opts = {}) => {
    const fontSize = opts.size || 12;
    const padX = 10;
    const padY = 5;
    const approxChar = fontSize * 0.62;
    const tw = Math.ceil(String(text).length * approxChar);
    const w = tw + padX * 2;
    const h = fontSize + padY * 2;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const stroke = opts.stroke || C.line;
    const fill = opts.fill || C.white;
    const textFill = opts.textFill || C.ink;
    return [
      `<rect class="edge-pill" x="${x}" y="${y}" width="${w}" height="${h}" rx="999" fill="${fill}" stroke="${stroke}"/>`,
      `<text class="edge-pill-text" x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="700" fill="${textFill}">${esc(text)}</text>`,
    ].join('\n');
  };

  const hEdge = (x1, y, x2, text, opts = {}) => {
    const mid = (x1 + x2) / 2;
    const color = opts.color || C.line;
    return [
      arrow(x1, y, x2, y, { ...opts, color }),
      edgePill(mid, y, text, {
        stroke: color,
        textFill: opts.textFill || color,
        fill: opts.pillFill || C.white,
        size: opts.size || 12,
      }),
    ].join('\n');
  };

  const vEdge = (x, y1, y2, text, opts = {}) => {
    const mid = (y1 + y2) / 2;
    const color = opts.color || C.line;
    return [
      arrow(x, y1, x, y2, { ...opts, color }),
      edgePill(x, mid, text, {
        stroke: color,
        textFill: opts.textFill || color,
        fill: opts.pillFill || C.white,
        size: opts.size || 12,
      }),
    ].join('\n');
  };

  const panelTitle = (x, y, text) =>
    `<text class="panel-title" x="${x}" y="${y}">${esc(text)}</text>`;

  const defs = () => `<defs>
  <marker id="arrowhead" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="9" refX="10" refY="4.5" orient="auto">
    <polygon points="0 0, 12 4.5, 0 9" fill="${C.line}"/>
  </marker>
  <marker id="arrowhead-mal" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="9" refX="10" refY="4.5" orient="auto">
    <polygon points="0 0, 12 4.5, 0 9" fill="${C.mal.stroke}"/>
  </marker>
  <marker id="arrowhead-mock" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="9" refX="10" refY="4.5" orient="auto">
    <polygon points="0 0, 12 4.5, 0 9" fill="${C.mock.stroke}"/>
  </marker>
  <marker id="arrowhead-floci" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="9" refX="10" refY="4.5" orient="auto">
    <polygon points="0 0, 12 4.5, 0 9" fill="${C.floci.stroke}"/>
  </marker>
  <marker id="arrowhead-gate" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="9" refX="10" refY="4.5" orient="auto">
    <polygon points="0 0, 12 4.5, 0 9" fill="${C.gate.stroke}"/>
  </marker>
  <filter id="soft" x="-5%" y="-5%" width="110%" height="110%">
    <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity="0.08"/>
  </filter>
</defs>`;

  const style = () => `<style>
  .box { stroke-width: 2; stroke-linejoin: round; }
  .title { font-family: 'Segoe UI', system-ui, sans-serif; font-weight: 700; fill: ${C.ink}; }
  .caption { font-family: 'Segoe UI', system-ui, sans-serif; fill: ${C.muted}; }
  .panel-title { font-family: 'Segoe UI', system-ui, sans-serif; fill: ${C.ink}; font-size: 15px; font-weight: 700; }
  text { font-family: 'Segoe UI', system-ui, sans-serif; }
  .arrow { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .edge-pill { stroke-width: 1.5; }
  .edge-pill-text { font-family: 'Segoe UI', system-ui, sans-serif; }
</style>`;

  return { box, label, multi, arrow, edgePill, hEdge, vEdge, panelTitle, defs, style };
}

/**
 * Dense SVG for every scenario — same Panel A–E structure as the Scenario 01 pilot.
 * Parameterized from DETAIL[id] + observability fields + optional attack_steps strip.
 */
function buildSvg(scenario, diagramMeta) {
  const id = scenario.scenario_id;
  const d = DETAIL[id];
  if (!d) {
    throw new Error(`Missing DETAIL['${id}'] in scripts/lib/scenario-codeflow-detail.js`);
  }

  const { box, label, multi, arrow, edgePill, hEdge, vEdge, panelTitle, defs, style } = svgHelpers();
  const W = 1520;
  const H = 2224;
  const port = d.mockPort || portFromMock(scenario.mock_label);
  const ep = d.endpointPath || endpointPathToken(scenario.mock_endpoint);
  const host = exfilHostFromDetail(d);
  const steps = diagramMeta.attack_steps || [];
  const compareRows = d.compareRows || [];

  const metaRow = (y, field, left, right, highlightRight = false) => {
    const rightFill = highlightRight ? C.mal.stroke : C.ink;
    return [
      label(80, y, field, { size: 12, fill: C.muted, weight: 600 }),
      label(260, y, left, { size: 12, weight: 500 }),
      label(820, y, right, { size: 12, weight: highlightRight ? 700 : 500, fill: rightFill }),
    ].join('\n');
  };

  const stepStrip =
    steps.length > 0
      ? steps
          .map((s, i) => `${i + 1}:${s.from}→${s.to}`)
          .join(' · ')
          .slice(0, 110)
      : `Trigger: ${scenario.trigger_action}`.slice(0, 110);

  const panelATitle =
    id === '01'
      ? 'Panel A — Package identity: same idea, one letter missing (what npm / package.json expose)'
      : `Panel A — Identity / deception: ${d.deceptionPill} (what manifests expose)`;

  const panelBTitle =
    id === '01'
      ? 'Panel B — index.js: identical public API; malicious file runs code before export (invisible at call sites)'
      : `Panel B — Code surfaces side-by-side (${d.codeEdgePill}; not a thin step list)`;

  const panelDTitle =
    id === '01'
      ? 'Panel D — Exact require-time control flow inside request-lib (what you cannot see from RequestLib.get)'
      : `Panel D — Runtime control flow + ${host}:${port}${ep} (TESTBENCH_MODE gate)`;

  const payloadBlock = d.runtime.payloadLines.slice(0, 11);
  while (payloadBlock.length < 7) payloadBlock.push('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scenario ${esc(id)} detailed code-level ${esc(d.title)} workflow">
${style()}
${defs()}

<rect width="${W}" height="${H}" fill="${C.white}"/>
<text class="title" x="28" y="32" font-size="22">Scenario ${esc(id)} — code-level ${esc(d.title)} workflow (detailed)</text>
<text class="caption" x="28" y="54" font-size="13">${esc(d.subtitle)}</text>

${box(28, 72, 1464, 40, C.gate.soft, C.gate.stroke, 8)}
${label(44, 97, d.triggerStrip, { size: 12, weight: 600 })}

<!-- ========== PANEL A ========== -->
${box(28, 132, 1464, 360, C.panel, C.panelStroke, 12)}
${panelTitle(44, 158, panelATitle)}

${box(80, 178, 500, 52, C.legit.fill, C.legit.stroke, 8)}
${multi(96, 196, [d.intended.title, d.intended.path], { size: 13, leading: 18 })}
${box(820, 178, 600, 52, C.mal.fill, C.mal.stroke, 8)}
${multi(836, 196, [d.malicious.title, d.malicious.path], { size: 13, leading: 18 })}

${hEdge(580, 204, 820, d.deceptionPill, {
  dashed: true,
  color: C.mal.stroke,
  marker: '#arrowhead-mal',
  textFill: C.mal.stroke,
  size: 13,
})}

${label(80, 258, 'Field', { size: 12, fill: C.muted })}
${label(260, 258, d.intended.path, { size: 12, fill: C.legit.stroke })}
${label(820, 258, d.malicious.path, { size: 12, fill: C.mal.stroke })}
<path d="M80 268 H1440" stroke="#e2e8f0" stroke-width="2" fill="none"/>

${compareRows
  .slice(0, 5)
  .map((row, i) => metaRow(292 + i * 22, row[0], row[1], row[2], Boolean(row[3])))
  .join('\n')}

${box(80, 400, 1340, 78, C.mal.soft, C.mal.stroke, 8)}
${label(96, 418, d.victimDep.label, { size: 11, fill: C.mal.stroke })}
${multi(96, 438, d.victimDep.lines.slice(0, 3), {
  size: 12,
  leading: 15,
  mono: true,
  fill: C.mal.stroke,
  weight: 600,
})}

<!-- ========== PANEL B ========== -->
${box(28, 516, 1464, 300, C.panel, C.panelStroke, 12)}
${panelTitle(44, 542, panelBTitle)}

${box(80, 562, 560, 228, C.legit.soft, C.legit.stroke)}
${label(96, 586, d.legitCode.title, { size: 13, fill: C.legit.stroke })}
${multi(96, 612, d.legitCode.lines.slice(0, 9), { size: 12, leading: 16, mono: true })}

${hEdge(640, 676, 780, d.codeEdgePill, {
  color: C.muted,
  textFill: C.muted,
  size: 12,
})}

${box(780, 562, 640, 228, C.mal.soft, C.mal.stroke)}
${label(796, 586, d.malCode.title, { size: 13, fill: C.mal.stroke })}
${multi(796, 612, d.malCode.lines.slice(0, 9), { size: 12, leading: 16, mono: true })}

<!-- ========== PANEL C ========== -->
${box(28, 840, 1464, 220, C.panel, C.panelStroke, 12)}
${panelTitle(44, 866, 'Panel C — setup.sh (one-time prep) then two terminals (lab run)')}

${box(80, 890, 360, 140, C.setup.soft, C.setup.stroke)}
${label(96, 912, '1) ./setup.sh', { size: 13, fill: C.setup.stroke })}
${multi(96, 936, d.setupLines.slice(0, 5), { size: 11, leading: 15, mono: true })}

${hEdge(440, 960, 520, 'then start', { color: C.line, size: 11 })}

${box(520, 890, 380, 140, C.mock.soft, C.mock.stroke)}
${label(536, 912, '2) Terminal A — mock collector', { size: 13, fill: C.mock.stroke })}
${multi(536, 936, d.mockLines.slice(0, 5), { size: 11, leading: 15, mono: true })}

${hEdge(900, 960, 980, 'in parallel', { color: C.line, size: 11 })}

${box(980, 890, 440, 140, C.victim.soft, C.victim.stroke)}
${label(996, 912, '3) Terminal B — lab run', { size: 13, fill: C.victim.stroke })}
${multi(996, 936, d.labLines.slice(0, 5), { size: 11, leading: 15, mono: true })}

${box(80, 1036, 1340, 18, C.gate.soft, C.gate.stroke, 6)}
${label(96, 1049, `Attack steps (compact): ${stepStrip}`, { size: 10, weight: 600, fill: C.gate.stroke })}

<!-- ========== PANEL D ========== -->
${box(28, 1084, 1464, 720, C.panel, C.panelStroke, 12)}
${panelTitle(44, 1110, panelDTitle)}

${box(80, 1140, 170, 64, C.victim.fill, C.victim.stroke)}
${multi(92, 1162, d.runtime.victimBox.slice(0, 2), { size: 12, leading: 18 })}

${hEdge(250, 1172, 330, 'loads', { color: C.mal.stroke, marker: '#arrowhead-mal', textFill: C.mal.stroke, size: 12 })}

${box(330, 1140, 190, 64, C.mal.fill, C.mal.stroke)}
${multi(342, 1162, d.runtime.malBox.slice(0, 2), { size: 12, leading: 18 })}

${hEdge(520, 1172, 600, 'calls', { color: C.gate.stroke, marker: '#arrowhead-gate', textFill: C.gate.stroke, size: 12 })}

${box(600, 1140, 250, 64, C.gate.fill, C.gate.stroke)}
${multi(612, 1158, [
  "TESTBENCH_MODE === 'enabled'?",
  'runtime safety gate',
], { size: 12, leading: 18 })}

${box(980, 1128, 200, 56, C.setup.fill, C.setup.stroke)}
${multi(992, 1148, ['NO → [SAFE MODE]', 'skip network; return'], { size: 12, leading: 16 })}
${arrow(850, 1156, 980, 1156, { color: C.setup.stroke, marker: '#arrowhead', width: 2.75 })}
${edgePill(915, 1156, 'no', { stroke: C.setup.stroke, textFill: C.setup.stroke, size: 12 })}

${box(980, 1212, 200, 56, C.legit.fill, C.legit.stroke)}
${multi(992, 1232, ['YES → continue', 'build + send payload'], { size: 12, leading: 16 })}
${arrow(850, 1188, 980, 1232, { color: C.legit.stroke, marker: '#arrowhead', width: 2.75 })}
${edgePill(920, 1220, 'yes', { stroke: C.legit.stroke, textFill: C.legit.stroke, size: 12 })}

${box(80, 1252, 560, 240, C.code.soft, C.code.fill)}
${label(96, 1276, d.runtime.payloadTitle, { size: 13, fill: '#e2e8f0' })}
${multi(96, 1300, payloadBlock, { size: 11, leading: 15, mono: true, fill: '#e2e8f0' })}

${arrow(980, 1240, 640, 1312, { color: C.legit.stroke, width: 2.75, marker: '#arrowhead' })}
${edgePill(820, 1260, 'build payload', { stroke: C.legit.stroke, textFill: C.legit.stroke, size: 12 })}

${box(900, 1332, 520, 88, C.mock.soft, C.mock.stroke)}
${label(916, 1354, d.runtime.mockTitle, { size: 13, fill: C.mock.stroke })}
${multi(916, 1376, d.runtime.mockLines.slice(0, 2), { size: 11, leading: 15, mono: true })}

${hEdge(640, 1376, 900, `POST ${ep}`, {
  color: C.mock.stroke,
  marker: '#arrowhead-mock',
  textFill: C.mock.stroke,
  size: 12,
})}

${box(900, 1452, 240, 96, C.floci.soft, C.floci.stroke)}
${label(916, 1474, 'Optional Floci', { size: 12, fill: C.floci.stroke })}
${multi(916, 1496, d.runtime.flociLines.slice(0, 2), { size: 11, leading: 15, mono: true })}

${box(1180, 1452, 240, 96, C.setup.soft, C.setup.stroke)}
${label(1196, 1474, 'Capture hint', { size: 12, fill: C.muted })}
${multi(1196, 1496, [
  captureFileLabel(d.captureFile),
  `${host}:${port}${ep}`,
], { size: 11, leading: 15 })}

${hEdge(640, 1500, 900, 'SCAS_FLOCI_ENABLED', {
  dashed: true,
  color: C.floci.stroke,
  marker: '#arrowhead-floci',
  textFill: C.floci.stroke,
  size: 11,
})}

${box(80, 1592, 560, 100, C.legit.soft, C.legit.stroke)}
${label(96, 1616, d.runtime.coverTitle, { size: 13, fill: C.legit.stroke })}
${multi(96, 1640, d.runtime.coverLines.slice(0, 3), { size: 11, leading: 15, mono: true })}

${vEdge(360, 1492, 1592, 'then', { color: C.legit.stroke, marker: '#arrowhead', textFill: C.legit.stroke, size: 12 })}

${box(900, 1592, 520, 100, C.victim.soft, C.victim.stroke)}
${label(916, 1616, 'What is visible vs invisible', { size: 13, fill: C.victim.stroke })}
${multi(916, 1640, d.runtime.visibleLines.slice(0, 3), { size: 11, leading: 15 })}

${hEdge(640, 1642, 900, 'cover traffic', {
  color: C.victim.stroke,
  marker: '#arrowhead',
  textFill: C.victim.stroke,
  size: 11,
})}

<!-- ========== PANEL E ========== -->
${box(28, 1832, 1464, 300, C.panel, C.panelStroke, 12)}
${panelTitle(44, 1858, 'Panel E — Verify + detection cues (from the same code paths)')}

${box(80, 1882, 400, 210, C.mock.soft, C.mock.stroke)}
${label(96, 1906, 'Verify evidence', { size: 13, fill: C.mock.stroke })}
${multi(96, 1932, d.verifyLines.slice(0, 7), { size: 11, leading: 16, mono: true })}

${box(560, 1882, 420, 210, C.mal.soft, C.mal.stroke)}
${label(576, 1906, 'Code-review red flags', { size: 13, fill: C.mal.stroke })}
${multi(576, 1932, d.redFlags.slice(0, 8), { size: 11, leading: 16 })}

${box(1060, 1882, 360, 210, C.gate.soft, C.gate.stroke)}
${label(1076, 1906, 'Safety contract (do not weaken)', { size: 13, fill: C.gate.stroke })}
${multi(1076, 1932, d.safetyLines.slice(0, 7), { size: 11, leading: 16 })}

${hEdge(480, 1987, 560, 'check', { color: C.mock.stroke, marker: '#arrowhead-mock', textFill: C.mock.stroke, size: 11 })}
${hEdge(980, 1987, 1060, 'also', { color: C.gate.stroke, marker: '#arrowhead-gate', textFill: C.gate.stroke, size: 11 })}

<text class="caption" x="28" y="2190" font-size="12">Sources of truth: scenarios/${esc(d.folder)} · localhost · TESTBENCH_MODE · [SAFE MODE] · SCAS_FLOCI_ENABLED · setup.sh · curl ${esc(ep)} · Regenerate: ${esc(REGEN_CMD)}</text>
</svg>
`;
}

function codePathNotes(scenario) {
  return [
    'Same path as the diagram:',
    '',
    `1. Collector. Start the localhost mock with \`${scenario.mock_start}\`.`,
    `2. Run lab. \`${scenario.lab_run}\` (${scenario.victim_label}).`,
    `3. Payload. ${scenario.trigger_action}. The cover behavior still returns, so the lab looks normal.`,
    "4. TESTBENCH. The malicious call runs only when `TESTBENCH_MODE === 'enabled'`. If it is off, the payload takes SAFE MODE and does not open the network. Do not point this path at a real host.",
    `5. Exfil. \`${scenario.mock_endpoint}\` stays on localhost. Verify with \`${scenario.verify_cli}\`. Elasticsearch indexing is a later step, not this path.`,
    '',
  ].join('\n');
}

function codeflowSectionMarkdown(scenario) {
  const id = scenario.scenario_id;
  const folder = scenario.folder;
  const file = `sc${folder}-workflow.html`;
  const site = `archify/scenarios/${folder}/workflow/${file}`;
  const github = `https://github.com/RAJANAGORI/supply-chain-attack-simulator/blob/main/.archify/scenarios/${folder}/workflow/${file}`;
  return [
    CODE_MARKER,
    '',
    `<iframe class="archify-embed" title="Scenario ${id} code-level workflow" src="${site}" loading="lazy"></iframe>`,
    '',
    `<p class="archify-embed-caption">Code path for Scenario ${id}: collector, lab run, payload, the TESTBENCH gate, localhost exfil or SAFE MODE, then verify. <a href="${site}" target="_blank" rel="noopener noreferrer">Open the full diagram</a>, or the <a href="${github}" target="_blank" rel="noopener noreferrer">HTML source on GitHub</a>.</p>`,
    '',
    codePathNotes(scenario),
    '',
  ].join('\n');
}

/**
 * Inject or replace ## Code-level workflow before the observability section.
 * Guides may be cursorignored — uses normal fs.
 */
function injectGuideSection(scenario) {
  const id = scenario.scenario_id;
  const guidePath = path.join(
    ROOT,
    `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_${id}.md`
  );
  if (!fs.existsSync(guidePath)) {
    console.warn(`skip guide inject: missing ${path.relative(ROOT, guidePath)}`);
    return;
  }

  let content = fs.readFileSync(guidePath, 'utf8');
  const section = codeflowSectionMarkdown(scenario);

  const codeStart = content.indexOf(CODE_MARKER);
  if (codeStart !== -1) {
    const afterMarker = content.slice(codeStart + CODE_MARKER.length);
    const nextH2Rel = afterMarker.search(/\n## /);
    const endIdx =
      nextH2Rel === -1 ? content.length : codeStart + CODE_MARKER.length + nextH2Rel + 1;
    content = content.slice(0, codeStart) + section + content.slice(endIdx);
  } else {
    const obsIdx = content.indexOf(OBS_MARKER);
    if (obsIdx !== -1) {
      content = content.slice(0, obsIdx) + section + content.slice(obsIdx);
    } else {
      content = `${content.replace(/\s*$/, '')}\n\n${section}`;
    }
  }

  fs.writeFileSync(guidePath, content);
  console.log(`injected ${path.relative(ROOT, guidePath)}`);
}

function main() {
  if (process.argv.includes('--inject-only')) {
    for (const scenario of META) injectGuideSection(scenario);
    return;
  }
  let count = 0;
  for (const scenario of META) {
    const id = scenario.scenario_id;
    if (!DETAIL[id]) {
      throw new Error(`DETAIL missing for scenario ${id}`);
    }
    const diagramMeta = SCENARIO_DIAGRAMS[id] || {
      intro: scenario.trigger_action,
      attack_steps: [{ from: 'Learner', to: 'Victim', message: scenario.trigger_action }],
    };

    const basename = `scas-codeflow-scenario-${id}`;
    const assets = diagramAssetPaths(basename, 'codeflow');
    fs.mkdirSync(path.dirname(path.join(ROOT, assets.svg)), { recursive: true });
    fs.mkdirSync(path.dirname(path.join(ROOT, assets.excalidraw)), { recursive: true });

    const d = DETAIL[id];
    fs.writeFileSync(
      path.join(ROOT, assets.excalidraw),
      `${JSON.stringify(buildExcalidraw(scenario, diagramMeta, d), null, 2)}\n`
    );
    fs.writeFileSync(path.join(ROOT, assets.svg), `${buildSvg(scenario, diagramMeta)}\n`);
    count += 1;
    console.log(`wrote ${assets.svg}`);
    console.log(`wrote ${assets.excalidraw}`);

    injectGuideSection(scenario);
  }
  console.log(`\nGenerated ${count} scenario codeflow diagrams.`);
}

main();
