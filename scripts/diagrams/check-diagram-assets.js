#!/usr/bin/env node
'use strict';

/**
 * Harness: enforce diagram drawing contract.
 *
 * Specs: scripts/lib/diagram-specs.js
 * Assets: documentation/assets/diagrams/<category>/{svg,excalidraw}/<basename>.*
 *
 * Usage (repo root):
 *   node scripts/diagrams/check-diagram-assets.js
 *   (compat): node scripts/diagrams/check-diagram-assets.js
 */

const fs = require('fs');
const path = require('path');
const {
  DIAGRAM_SPECS,
  DRAWING_RULES,
  DIAGRAMS_DIR,
  diagramAssetPaths,
} = require('../lib/diagram-specs');

const ROOT = path.resolve(__dirname, '../..');
const failures = [];
const passes = [];

function ok(msg) {
  passes.push(msg);
  console.log(`PASS: ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  try {
    fs.accessSync(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

/** Reject bare & that would break SVG/XML parsers (common Cursor/preview failure). */
function findBareAmpersands(svgText) {
  const bad = [];
  const re = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g;
  let m;
  while ((m = re.exec(svgText)) !== null) {
    const start = Math.max(0, m.index - 30);
    const snippet = svgText.slice(start, m.index + 20).replace(/\s+/g, ' ');
    bad.push(snippet);
  }
  return bad;
}

function assertSvgWellFormed(basename, svgText) {
  if (!/^\s*<\?xml/i.test(svgText) && !/^\s*<svg[\s>]/i.test(svgText)) {
    fail(`${basename}.svg: must start with <?xml …?> or <svg`);
    return;
  }
  if (!/<svg[\s>]/i.test(svgText) || !/<\/svg>\s*$/i.test(svgText.trim())) {
    fail(`${basename}.svg: missing <svg>…</svg> root`);
  }
  const bare = findBareAmpersands(svgText);
  if (bare.length) {
    fail(
      `${basename}.svg: unescaped & (use &amp;) — ${bare.length} hit(s); e.g. …${bare[0]}…`
    );
  } else {
    ok(`${basename}.svg: no bare & (XML-safe ampersands)`);
  }
}

function assertPair(spec) {
  const paths = diagramAssetPaths(spec.basename, spec.category);
  const ex = paths.excalidraw;
  const svg = paths.svg;
  if (!exists(ex)) fail(`missing editable source ${ex}`);
  else ok(`has ${ex}`);
  if (!exists(svg)) fail(`missing renderable ${svg}`);
  else ok(`has ${svg}`);
  return { ex, svg, embedNeedle: paths.embedNeedle };
}

function assertLabels(spec, svgText) {
  const missing = spec.requiredLabels.filter((needle) => !svgText.includes(needle));
  if (missing.length) {
    fail(`${spec.basename}.svg missing required labels: ${missing.join(', ')}`);
  } else {
    ok(`${spec.basename}.svg has all ${spec.requiredLabels.length} required labels`);
  }
}

/**
 * Observability scenario SVGs: lock the detailed Phase 1–5 layout we ship.
 * Catches regressions (tiny arrowheads via strokeWidth markers, clipped edge
 * pills, missing Terminal A/B content, collapsed Phase-2 step gaps, etc.).
 */
function assertObservabilityScenarioLayout(basename, svgText) {
  const m = basename.match(/^scas-observability-scenario-(\d{2})$/);
  if (!m) return;
  const id = m[1];
  const prefix = `${basename}.svg`;

  // --- Shared arrow styling (Phases 1–5) ---
  if (!/markerUnits="userSpaceOnUse"/.test(svgText)) {
    fail(`${prefix}: arrow markers must use markerUnits="userSpaceOnUse" (strokeWidth inflates heads)`);
  } else {
    ok(`${prefix}: arrowheads use userSpaceOnUse`);
  }
  const markerW = svgText.match(/marker id="arrowhead"[^>]*markerWidth="(\d+(?:\.\d+)?)"/);
  if (!markerW || Number(markerW[1]) > 12) {
    fail(`${prefix}: arrowhead markerWidth must be ≤12 (got ${markerW ? markerW[1] : 'missing'})`);
  } else {
    ok(`${prefix}: arrowhead markerWidth=${markerW[1]}`);
  }
  if (!/\.edge-pill\s*\{/.test(svgText) || !/\.edge-label\s*\{/.test(svgText)) {
    fail(`${prefix}: must define .edge-pill / .edge-label styles for connector labels`);
  }

  // --- Header + actors ---
  if (!svgText.includes(`SC ${id}`) || !svgText.includes(`Scenario ${id}`)) {
    fail(`${prefix}: missing header badge/title for scenario ${id}`);
  } else {
    ok(`${prefix}: header badge + title`);
  }
  if (!svgText.includes('Actors (this lab)')) {
    fail(`${prefix}: missing Actors strip`);
  } else if (
    !svgText.includes('Learner (you)') ||
    !svgText.includes('Elasticsearch') ||
    !svgText.includes('Kibana')
  ) {
    fail(`${prefix}: Actors strip must include Learner, Elasticsearch, Kibana`);
  } else {
    ok(`${prefix}: Actors strip present`);
  }

  // --- Phase titles ---
  const phaseNeedles = [
    'Phase 1 — Collectors (Terminal A)',
    'Phase 2 — Lab execution (Terminal B)',
    'Phase 3 — Exfiltration',
    'Phase 4 — Optional Elasticsearch',
    'Phase 5 — Blue-team review',
  ];
  const missingPhases = phaseNeedles.filter((n) => !svgText.includes(n));
  if (missingPhases.length) {
    fail(`${prefix}: missing phase chrome: ${missingPhases.join('; ')}`);
  } else {
    ok(`${prefix}: Phase 1–5 titles present`);
  }

  // --- Phase 1 (Terminal A) ---
  const p1Needles = [
    'Boot the localhost collector',
    'export TESTBENCH_MODE=enabled',
    'export SCAS_ES_URL=http://localhost:9200',
    'cd scenarios/',
  ];
  const missingP1 = p1Needles.filter((n) => !svgText.includes(n));
  if (missingP1.length) {
    fail(`${prefix}: Phase 1 Terminal A missing: ${missingP1.join(', ')}`);
  } else {
    ok(`${prefix}: Phase 1 Terminal A commands`);
  }

  // --- Phase 2 numbered steps (must match scenario-diagram-steps) ---
  let expectedSteps = 0;
  try {
    const { SCENARIO_DIAGRAMS } = require('../../detection-tools/es/scenario-diagram-steps');
    expectedSteps = (SCENARIO_DIAGRAMS[id] && SCENARIO_DIAGRAMS[id].attack_steps) || [];
    expectedSteps = expectedSteps.length;
  } catch {
    expectedSteps = 0;
  }
  const stepBadges = [...svgText.matchAll(/<text class="badge"[^>]*>(\d+)<\/text>/g)].map((x) =>
    Number(x[1])
  );
  // Header uses "SC NN" badge class too — filter to sequential 1..N only
  const numbered = stepBadges.filter((n) => n >= 1 && n <= 20);
  if (expectedSteps > 0) {
    const okCount =
      numbered.length === expectedSteps &&
      numbered.every((n, i) => n === i + 1);
    if (!okCount) {
      fail(
        `${prefix}: Phase 2 must show steps 1..${expectedSteps} (found [${numbered.join(', ')}])`
      );
    } else {
      ok(`${prefix}: Phase 2 numbered steps 1..${expectedSteps}`);
    }
  }
  if (!/<text class="chip"[^>]*>/.test(svgText)) {
    fail(`${prefix}: Phase 2 step cards must include from/to actor chips`);
  } else {
    ok(`${prefix}: Phase 2 actor chips`);
  }

  // Vertical step arrows: shaft ≥ 40px (stepGap contract)
  const vertArrows = [
    ...svgText.matchAll(/<path class="arrow" d="M(\d+(?:\.\d+)?) (\d+(?:\.\d+)?) L(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"\/>/g),
  ].filter((a) => Number(a[1]) === Number(a[3]) && Number(a[4]) > Number(a[2]));
  if (expectedSteps > 1 && vertArrows.length < expectedSteps - 1) {
    fail(
      `${prefix}: Phase 2 needs ${expectedSteps - 1} vertical step arrows (found ${vertArrows.length})`
    );
  }
  const shortVert = vertArrows.filter((a) => Math.abs(Number(a[4]) - Number(a[2])) < 40);
  if (shortVert.length) {
    fail(`${prefix}: Phase 2 stepGap shafts must be ≥40px (got ${shortVert.map((a) => Math.abs(Number(a[4]) - Number(a[2]))).join(',')})`);
  } else if (vertArrows.length) {
    ok(`${prefix}: Phase 2 vertical step shafts ≥40px`);
  }

  // --- Lanes geometry ---
  const laneRe =
    /<rect class="lane" x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)" width="(\d+(?:\.\d+)?)"(?: height="(\d+(?:\.\d+)?)")?/g;
  /** @type {{ x: number, y: number, w: number, h: number, index: number }[]} */
  const lanes = [];
  let lm;
  while ((lm = laneRe.exec(svgText)) !== null) {
    lanes.push({
      x: Number(lm[1]),
      y: Number(lm[2]),
      w: Number(lm[3]),
      h: lm[4] != null ? Number(lm[4]) : 0,
      index: lm.index,
    });
  }

  const byY = new Map();
  for (const lane of lanes) {
    const key = Math.round(lane.y);
    if (!byY.has(key)) byY.set(key, []);
    byY.get(key).push(lane);
  }
  const rowPairs = [...byY.values()].filter((g) => g.length === 2).sort((a, b) => a[0].y - b[0].y);
  const rowTriples = [...byY.values()].filter((g) => g.length === 3).sort((a, b) => a[0].y - b[0].y);
  const phase12 = rowPairs[0];
  const phase345 = rowTriples[0];
  const verifyLane = lanes.find((l) => l.w >= 1000);

  if (!phase12) {
    fail(`${prefix}: expected Phase 1 | Phase 2 twin lanes on one row`);
    return;
  }
  phase12.sort((a, b) => a.x - b.x);
  const [p1, p2] = phase12;
  const p12Gutter = p2.x - (p1.x + p1.w);
  if (p12Gutter < 40) {
    fail(`${prefix}: Phase 1→2 gutter too narrow (${p12Gutter}px)`);
  } else {
    ok(`${prefix}: Phase 1→2 gutter ${p12Gutter}px`);
  }

  // Phase 1→2 "then" pill
  const thenPill = svgText.match(
    /<rect class="edge-pill" x="(-?\d+(?:\.\d+)?)" y="(-?\d+(?:\.\d+)?)" width="(\d+(?:\.\d+)?)"[^>]*\/?>\s*<text class="edge-label"[^>]*>then<\/text>/
  );
  if (!thenPill) {
    fail(`${prefix}: missing edge-pill label "then" on Phase 1→2 connector`);
  } else {
    const tx = Number(thenPill[1]);
    const tw = Number(thenPill[3]);
    const gL = p1.x + p1.w;
    const gR = p2.x;
    if (tw > gR - gL + 1 || tx < gL - 1 || tx + tw > gR + 1) {
      fail(
        `${prefix}: "then" pill [${tx},${tx + tw}] must fit Phase 1→2 gutter [${gL},${gR}]`
      );
    } else if (thenPill.index < p2.index) {
      fail(`${prefix}: "then" edge-pill must paint after Phase 2 lane (z-order)`);
    } else {
      ok(`${prefix}: Phase 1→2 "then" pill fits + z-order`);
    }
  }

  if (!phase345) {
    fail(`${prefix}: expected three Phase 3–5 lanes on one row`);
    return;
  }
  phase345.sort((a, b) => a.x - b.x);
  const [p3, p4, p5] = phase345;
  if (p3.y <= phase12[0].y) {
    fail(`${prefix}: Phase 3–5 row must sit below Phase 1–2`);
  }

  // --- Phase 3 content ---
  if (
    !svgText.includes('127.0.0.1') ||
    !svgText.includes('TESTBENCH_MODE=enabled') ||
    !svgText.includes('localhost only')
  ) {
    fail(`${prefix}: Phase 3 must state localhost exfil + TESTBENCH_MODE gate`);
  } else {
    ok(`${prefix}: Phase 3 exfil safety copy`);
  }

  // --- Phase 4 / 5 content ---
  if (!svgText.includes('scas-detections') || !svgText.includes('file-only capture')) {
    fail(`${prefix}: Phase 4 must mention scas-detections + file-only default`);
  } else {
    ok(`${prefix}: Phase 4 optional ES copy`);
  }
  if (
    !svgText.includes('localhost:5601') ||
    !svgText.includes(`SCAS Detections ${id}`) ||
    !svgText.includes(`SCAS Rules ${id}`)
  ) {
    fail(`${prefix}: Phase 5 must point at Kibana Discover for scenario ${id}`);
  } else {
    ok(`${prefix}: Phase 5 Kibana review copy`);
  }

  // Phase 3→4 SCAS_ES_URL pill
  const pillMatch = svgText.match(
    /<rect class="edge-pill" x="(-?\d+(?:\.\d+)?)" y="(-?\d+(?:\.\d+)?)" width="(\d+(?:\.\d+)?)"[^>]*\/?>\s*<text class="edge-label"[^>]*>SCAS_ES_URL<\/text>/
  );
  if (!pillMatch) {
    fail(`${prefix}: missing edge-pill + edge-label "SCAS_ES_URL" on Phase 3→4 dashed connector`);
  } else {
    const pillX = Number(pillMatch[1]);
    const pillW = Number(pillMatch[3]);
    const gutterLeft = p3.x + p3.w;
    const gutterRight = p4.x;
    const gutter = gutterRight - gutterLeft;
    if (gutter < 100) {
      fail(`${prefix}: Phase 3→4 gutter (${gutter}px) must be ≥100px to fit SCAS_ES_URL`);
    } else if (pillX < gutterLeft - 0.5 || pillX + pillW > gutterRight + 0.5) {
      fail(
        `${prefix}: SCAS_ES_URL pill [${pillX}, ${pillX + pillW}] must sit inside gutter [${gutterLeft}, ${gutterRight}]`
      );
    } else if (pillMatch.index < Math.max(p3.index, p4.index, p5.index)) {
      fail(
        `${prefix}: SCAS_ES_URL edge-pill must be drawn after Phase 3–5 lanes (z-order)`
      );
    } else {
      ok(`${prefix}: Phase 3→4 SCAS_ES_URL pill fits + z-order (${gutter}px gutter)`);
    }
  }

  const arrowOpt = svgText.match(
    /<path class="arrow-opt" d="M(\d+(?:\.\d+)?) (\d+(?:\.\d+)?) L(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"\/>/
  );
  if (!arrowOpt) {
    fail(`${prefix}: missing dashed arrow-opt for optional SCAS_ES_URL path`);
  } else {
    const shaft = Math.abs(Number(arrowOpt[3]) - Number(arrowOpt[1]));
    if (shaft < 100) {
      fail(`${prefix}: Phase 3→4 dashed shaft too short (${shaft}px)`);
    } else {
      ok(`${prefix}: Phase 3→4 dashed shaft ${shaft}px`);
    }
  }

  // Phase 4→5 solid horizontal arrow
  const hArrows = [
    ...svgText.matchAll(/<path class="arrow" d="M(\d+(?:\.\d+)?) (\d+(?:\.\d+)?) L(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"\/>/g),
  ].filter((a) => Number(a[2]) === Number(a[4]) && Number(a[3]) > Number(a[1]));
  const p45GutterLeft = p4.x + p4.w;
  const p45GutterRight = p5.x;
  const p45Arrow = hArrows.find(
    (a) =>
      Math.abs(Number(a[1]) - p45GutterLeft) <= 2 && Math.abs(Number(a[3]) - p45GutterRight) <= 2
  );
  if (!p45Arrow) {
    fail(`${prefix}: missing solid Phase 4→5 connector across gutter`);
  } else if (p45GutterRight - p45GutterLeft < 100) {
    fail(`${prefix}: Phase 4→5 gutter too narrow (${p45GutterRight - p45GutterLeft}px)`);
  } else {
    ok(`${prefix}: Phase 4→5 solid connector (${p45GutterRight - p45GutterLeft}px gutter)`);
  }

  // --- Verify footer ---
  if (
    !svgText.includes('Verify locally') ||
    !/curl -s http:\/\/(localhost|127\.0\.0\.1):/.test(svgText)
  ) {
    fail(`${prefix}: missing Verify locally / curl footer`);
  } else {
    ok(`${prefix}: Verify locally footer`);
  }
  if (!svgText.includes('educational test bench') || !/Solid arrows = always-on/.test(svgText)) {
    fail(`${prefix}: missing safety / legend captions`);
  } else {
    ok(`${prefix}: safety + legend captions`);
  }

  if (!verifyLane) {
    fail(`${prefix}: missing full-width Verify lane`);
  } else if (verifyLane.y <= p3.y) {
    fail(`${prefix}: Verify lane must sit below Phase 3–5`);
  }
}

function resolveMarkdownDocs(spec) {
  const docs = [];
  if (spec.markdownDoc) docs.push(spec.markdownDoc);
  if (Array.isArray(spec.markdownDocs)) docs.push(...spec.markdownDocs);
  if (spec.markdownDocGlob) {
    const dir = path.join(ROOT, spec.markdownDocGlob.dir);
    const re = new RegExp(
      '^' +
        spec.markdownDocGlob.pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*') +
        '$'
    );
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (re.test(name)) {
          docs.push(path.join(spec.markdownDocGlob.dir, name).split(path.sep).join('/'));
        }
      }
    }
  }
  return docs.sort();
}

function archifyIframePattern(repoPath) {
  const siteNeedle = String(repoPath).replace(/^\.archify\//, 'archify/');
  const escaped = siteNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    siteNeedle,
    re: new RegExp(`<iframe\\b[^>]*\\bsrc="${escaped}"`),
  };
}

function assertMarkdownContract(spec) {
  const docs = resolveMarkdownDocs(spec);
  if (!docs.length) {
    fail(`${spec.basename}: no markdownDoc / markdownDocs / markdownDocGlob resolved`);
    return;
  }

  if (spec.generatorMustNotEmitMermaid) {
    const genPaths = Array.isArray(spec.generatorMustNotEmitMermaid)
      ? spec.generatorMustNotEmitMermaid
      : [spec.generatorMustNotEmitMermaid];
    for (const genPath of genPaths) {
      if (!exists(genPath)) {
        // Local-only / gitignored generators (e.g. Substack drafts) are skipped in CI.
        ok(`${genPath}: skipped (not present in this checkout)`);
        continue;
      }
      const gen = read(genPath);
      if (/```mermaid/.test(gen) || /['"]```mermaid['"]/.test(gen)) {
        fail(`${genPath}: must not emit Mermaid for ${spec.basename}`);
      } else {
        ok(`${genPath}: does not emit Mermaid`);
      }
    }
  }

  if (spec.generatorMustEmitMermaidSequence) {
    const genPath = spec.generatorMustEmitMermaidSequence;
    if (!exists(genPath)) {
      fail(`${genPath}: missing (must emit Mermaid sequenceDiagram for scenarios)`);
    } else {
      const gen = read(genPath);
      const hasEmbed = /archify-embed/.test(gen) && !/\?embed=1/.test(gen);
      const hasArchitecture = hasEmbed && /'architecture'/.test(gen);
      const hasSequence = hasEmbed && /'sequence'/.test(gen);
      const hasMermaid = /```mermaid/.test(gen) || /\bsequenceDiagram\b/.test(gen);
      if (!hasArchitecture || !hasSequence) {
        fail(`${genPath}: must emit Archify architecture and sequence iframes without ?embed=1`);
      } else if (hasMermaid) {
        fail(`${genPath}: must frame the Archify sequence HTML, not a Mermaid sequence`);
      } else {
        ok(`${genPath}: emits Archify architecture + sequence iframes`);
      }
    }
  }

  let mermaidHits = 0;
  let sequenceHits = 0;
  let embedHits = 0;
  let resolveHits = 0;
  const sectionScoped =
    Boolean(spec.markdownDocGlob) ||
    /^scas-observability-scenario-\d{2}$/.test(spec.basename);
  const requireSequence = Boolean(spec.requireMermaidSequence);
  for (const doc of docs) {
    if (!exists(doc)) {
      fail(`${doc}: missing (diagram markdown target for ${spec.basename})`);
      continue;
    }
    const text = read(doc);
    const { embedNeedle } = diagramAssetPaths(spec.basename, spec.category);
    if (spec.archifyArchitecture || spec.archifyWorkflow) {
      const repoPath = spec.archifyArchitecture || spec.archifyWorkflow;
      const slot = spec.archifyArchitecture ? 'End-to-end flow' : 'Code-level workflow';
      const frame = archifyIframePattern(repoPath);
      if (!frame.re.test(text)) {
        fail(`${doc}: ${slot} must iframe ${frame.siteNeedle} with the viewer toolbar`);
      } else if (!exists(repoPath)) {
        fail(`${doc}: Archify embed missing file ${repoPath}`);
      } else {
        embedHits += 1;
        resolveHits += 1;
      }
    } else if (!text.includes(embedNeedle)) {
      fail(`${doc}: must embed ${embedNeedle}`);
    } else {
      embedHits += 1;
    }

    // Hand-authored platform diagrams stay SVG-only. Scenario 17's stage-chain
    // SVG lives in the same zero-to-hero file as the observability section, which
    // is allowed to keep a Mermaid sequence — strip that section before probing.
    let mermaidProbe = text;
    if (sectionScoped) {
      const m = text.match(
        /## Elasticsearch \+ Kibana observability \(optional\)[\s\S]*?(?=\n## Part |\n## 🆘|\n## 📚|\n## ⚠️|\n## 🎉|$)/
      );
      mermaidProbe = m ? m[0] : '';
      if (!m) {
        fail(`${doc}: missing Elasticsearch + Kibana observability section`);
      }
    } else if (/## Elasticsearch \+ Kibana observability \(optional\)/.test(text)) {
      mermaidProbe = text.replace(
        /## Elasticsearch \+ Kibana observability \(optional\)[\s\S]*?(?=\n## Part |\n## 🆘|\n## 📚|\n## ⚠️|\n## 🎉|$)/,
        ''
      );
    }

    const hasMermaid = /```mermaid\b/.test(mermaidProbe);
    const hasSequence = /```mermaid\b[\s\S]*?\bsequenceDiagram\b/.test(mermaidProbe);

    if (requireSequence && spec.archifySequence) {
      const frame = archifyIframePattern(spec.archifySequence);
      const probe = sectionScoped ? mermaidProbe : text;
      if (!frame.re.test(probe)) {
        fail(`${doc}: Sequence diagram section must iframe ${frame.siteNeedle} with the viewer toolbar`);
      } else if (!exists(spec.archifySequence)) {
        fail(`${doc}: Archify sequence missing file ${spec.archifySequence}`);
      } else if (hasMermaid) {
        fail(`${doc}: observability section must frame the Archify sequence HTML, not Mermaid, for ${spec.basename}`);
      } else {
        sequenceHits += 1;
      }
    } else if (requireSequence) {
      if (!hasSequence) {
        fail(
          `${doc}: observability section must include a sequence diagram for ${spec.basename}`
        );
      } else {
        sequenceHits += 1;
      }
    } else if (hasMermaid) {
      mermaidHits += 1;
      fail(
        `${doc}: must not contain \`\`\`mermaid — use SVG embed for ${spec.basename}`
      );
    }

    if (!spec.archifyArchitecture && !spec.archifyWorkflow) {
      const mdDir = path.dirname(path.join(ROOT, doc));
      const { category } = diagramAssetPaths(spec.basename, spec.category);
      const match = text.match(
        new RegExp(
          `!\\[[^\\]]*\\]\\((\\.\\./(?:\\.\\./)?assets/diagrams/${category}/svg/${spec.basename}\\.svg)\\)`
        )
      );
      if (!match) {
        fail(
          `${doc}: image embed path for ${category}/svg/${spec.basename}.svg not found or wrong relative form`
        );
      } else {
        const resolved = path.resolve(mdDir, match[1]);
        if (!fs.existsSync(resolved)) {
          fail(`${doc}: embed path resolves missing file ${resolved}`);
        } else {
          resolveHits += 1;
        }
      }
    }
  }

  if (requireSequence) {
    if (sequenceHits === docs.length) {
      ok(
        `${spec.basename}: Archify sequence frame + ${spec.archifyArchitecture ? 'architecture frame' : 'SVG'} in all ${docs.length} target(s)`
      );
    }
  } else if (mermaidHits === 0) {
    ok(`${spec.basename}: no Mermaid in contracted markdown section(s)`);
  }
  if (embedHits === docs.length) {
    ok(`${spec.basename}: embedded in all ${docs.length} markdown target(s)`);
  }
  if (resolveHits === docs.length) {
    ok(`${spec.basename}: all embed paths resolve`);
  }
}

function printDrawingRules() {
  console.log('Drawing rules (from scripts/lib/diagram-specs.js):');
  for (const rule of DRAWING_RULES) {
    console.log(`  • ${rule}`);
  }
  console.log('');
  console.log('Per-diagram edges to preserve:');
  for (const spec of DIAGRAM_SPECS) {
    console.log(`  ${spec.basename}:`);
    for (const edge of spec.edges) {
      console.log(`    - ${edge}`);
    }
  }
  console.log('');
}

function main() {
  printDrawingRules();

  if (!exists(DIAGRAMS_DIR)) {
    fail(`missing diagrams directory ${DIAGRAMS_DIR}`);
    process.exit(1);
  }

  const readme = `${DIAGRAMS_DIR}/README.md`;
  if (!exists(readme)) fail(`missing ${readme}`);
  else ok(`has ${readme}`);

  const docsApp = 'docs/assets/js/docs-app.js';
  if (!exists(docsApp) || !read(docsApp).includes('data-scas-frame')) {
    fail(`${docsApp}: must keep the Archify viewer toolbar visible inside guide iframes`);
  } else {
    ok(`${docsApp}: keeps the Archify viewer toolbar`);
  }

  for (const spec of DIAGRAM_SPECS) {
    console.log(`--- ${spec.basename} ---`);
    const { svg } = assertPair(spec);
    if (exists(svg)) {
      const svgText = read(svg);
      assertSvgWellFormed(spec.basename, svgText);
      assertLabels(spec, svgText);
      assertObservabilityScenarioLayout(spec.basename, svgText);
    }
    assertMarkdownContract(spec);
    console.log('');
  }

  // Specs themselves must document edges (non-empty) so agents know what to draw
  for (const spec of DIAGRAM_SPECS) {
    if (!spec.edges.length) fail(`${spec.basename}: DIAGRAM_SPECS.edges must be non-empty`);
    if (!spec.nodes.length) fail(`${spec.basename}: DIAGRAM_SPECS.nodes must be non-empty`);
    if (!spec.requiredLabels.length) {
      fail(`${spec.basename}: DIAGRAM_SPECS.requiredLabels must be non-empty`);
    }
  }

  console.log(`Summary: ${passes.length} pass, ${failures.length} fail`);
  if (failures.length) {
    console.error('');
    console.error('Diagram harness failed. Read scripts/lib/diagram-specs.js DRAWING_RULES + edges,');
    console.error('fix the SVG/.excalidraw pair, escape &, and keep Markdown on the SVG embed.');
    console.error('Then re-run: node scripts/diagrams/check-diagram-assets.js');
    process.exit(1);
  }
  ok(`all ${DIAGRAM_SPECS.length} hand-authored diagrams match drawing contract`);
  process.exit(0);
}

main();
