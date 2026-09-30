#!/usr/bin/env node
'use strict';

/**
 * Harness: catch public information mismatches against on-disk scenario truth.
 *
 * Source of truth = directories matching scenarios/NN-* (two-digit id).
 * Fails CI when counts, ranges, indexes, or derived docs drift (e.g. "22 labs"
 * after lab 23 landed).
 *
 * Usage (repo root):
 *   node scripts/docs/check-info-consistency.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCENARIOS_DIR = path.join(ROOT, 'scenarios');

const failures = [];
const passes = [];

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function ok(msg) {
  passes.push(msg);
  console.log(`PASS: ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function discoverScenarios() {
  const ids = [];
  for (const name of fs.readdirSync(SCENARIOS_DIR)) {
    const m = name.match(/^(\d{2})-/);
    if (!m) continue;
    const full = path.join(SCENARIOS_DIR, name);
    if (!fs.statSync(full).isDirectory()) continue;
    ids.push({ id: m[1], dir: name, full });
  }
  ids.sort((a, b) => a.id.localeCompare(b.id));
  return ids;
}

function missingIds(haveSet, expectedIds) {
  return expectedIds.filter((id) => !haveSet.has(id));
}

function extractIds(text, patterns) {
  const found = new Set();
  for (const re of patterns) {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    const global = new RegExp(re.source, flags);
    let m;
    while ((m = global.exec(text)) !== null) {
      found.add(m[1]);
    }
  }
  return found;
}

/** Patterns that claim a *total lab count* (not "Scenario 22"). */
const TOTAL_COUNT_PATTERNS = [
  { re: /\*\*(\d+)\*\*\s+self-contained labs/gi, label: 'self-contained labs (bold)' },
  { re: /\b(\d+)\s+self-contained labs/gi, label: 'self-contained labs' },
  { re: /\b(\d+)-lab\s+\[?catalog/gi, label: 'N-lab catalog' },
  { re: /\b(\d+)\s+attack labs\b/gi, label: 'attack labs' },
  { re: /\b(\d+)\s+hands-on\b/gi, label: 'hands-on' },
  { re: /\ball\s+\*\*(\d+)\*\*\s+scenarios?\b/gi, label: 'all **N** scenarios' },
  { re: /\ball\s+(\d+)\s+scenarios?\b/gi, label: 'all N scenarios' },
  { re: /\ball\s+(\d+)\s+labs?\b/gi, label: 'all N labs' },
  { re: /\b(\d+)\s+DETECT\.md runbooks\b/gi, label: 'DETECT runbooks' },
  { re: /\b(\d+)\s+scenario\s+DETECT\.md\b/gi, label: 'scenario DETECT.md' },
  { re: /\b(\d+)\s+step-by-step lab walkthroughs\b/gi, label: 'step-by-step walkthroughs' },
  { re: /\ball\s+(\d+)\s+walkthroughs\b/gi, label: 'all N walkthroughs' },
  { re: /\b(\d+)\s+learner walkthroughs\b/gi, label: 'learner walkthroughs' },
  { re: /\b(\d+)\s+command cheat sheets\b/gi, label: 'command cheat sheets' },
  { re: /\bindex \+ (\d+) instances\b/gi, label: 'module instances' },
  { re: /\ball\s+(\d+)\s+module cards\b/gi, label: 'module cards' },
  { re: /\b(\d+)-scenario lab curriculum\b/gi, label: 'scenario curriculum' },
  {
    re: /hero-stat-value">(\d+)<\/span>\s*<span class="hero-stat-label">Attack Scenarios</g,
    label: 'docs/index.html Attack Scenarios hero stat',
  },
  { re: /expected\s*>=\s*(\d+)/gi, label: 'smoke-observability floor' },
  { re: /value:\s*(\d+),\s*label:\s*'Attack labs'/g, label: 'landing Attack labs stat' },
  { re: /with\s+(\d+)\s+real-world\s+attack\s+scenarios/gi, label: 'with N real-world attack scenarios' },
  { re: /with\s+(\d+)\s+real-world\s+scenarios/gi, label: 'with N real-world scenarios' },
  { re: /against\s+(\d+)\s+real-world/gi, label: 'against N real-world' },
  { re: /covering\s+(\d+)\s+supply\s+chain/gi, label: 'covering N supply chain' },
  { re: /includes\s+(\d+)\s+comprehensive/gi, label: 'includes N comprehensive' },
  { re: />\s*(\d+)\s+Scenarios\s*</g, label: 'conference/docs N Scenarios chip' },
  { re: /numberOfCredits"\s*:\s*(\d+)/g, label: 'JSON-LD numberOfCredits' },
  { re: /Pick from\s+(\d+)\s+scenarios/gi, label: 'Pick from N scenarios' },
  { re: /walkthroughs for all\s+(\d+)\s+supply/gi, label: 'walkthroughs for all N supply' },
  { re: /(\d+)\s+supply chain attack scenario walkthroughs/gi, label: 'N supply chain walkthroughs' },
];

/**
 * Full-span ranges only (catalog / folder / module indexes).
 * Do NOT match learning-path subsets like "complete 01–05 before 06".
 */
const RANGE_PATTERNS = [
  { re: /Zero to Hero guides \(01→(\d{2})\)/g, label: 'Zero to Hero guides (01→NN)' },
  { re: /folders `01-` … `(\d{2})-`/g, label: 'folders 01- … NN-' },
  { re: /labs \(01- … (\d{2})-\)/g, label: 'labs (01- … NN-)' },
  { re: /attack labs \(01- … (\d{2})-\)/g, label: 'attack labs (01- … NN-)' },
  { re: /Module cards \(01[–-](\d{2})\)/g, label: 'Module cards (01–NN)' },
  { re: /Module Instances Index \(01-(\d{2})\)/g, label: 'Module Instances Index' },
  { re: /Full catalog \(01[–-](\d{2})\)/g, label: 'Full catalog (01–NN)' },
  { re: /Scenario catalog \(01[–-](\d{2})\)/g, label: 'Scenario catalog (01–NN)' },
  { re: /One pair per scenario \(01[–-](\d{2})\)/gi, label: 'per scenario pair (01–NN)' },
  { re: /for each scenario 01[–-](\d{2})/gi, label: 'for each scenario 01–NN' },
  { re: /Canonical mitigation bullets per scenario \(01[–-](\d{2})\)/g, label: 'playbooks comment' },
  { re: /numbered folders `01-` … `(\d{2})-`/g, label: 'numbered folders 01- … NN-' },
  { re: /# scenarios 02-(\d{2})\b/g, label: 'docs architecture scenarios 02-NN' },
  { re: /Zero to Hero guides 01[→\-](\d{2})/g, label: 'guide.html Zero to Hero 01-NN' },
];

const SAVED_SEARCHES_RES = [
  /\*\*(\d+)\*\*\s+saved searches/gi, // **46** saved searches
  /\*\*(\d+)\s+saved searches\*\*/gi, // **46 saved searches**
];

/** High-signal public / maintainer surfaces (not every markdown file). */
const SURFACE_FILES = [
  'README.md',
  'AUTHORS.md',
  'docs/AUTHORS.md',
  'docs/index.html',
  'docs/guide.html',
  'docs/docs-manifest.json',
  'observability/README.md',
  'apps/landing/src/content/site.ts',
  'scripts/observability/smoke-observability.sh',
  'scripts/lib/mitigation-playbooks.js',
  'documentation/index.md',
  'documentation/scenario-guides/index.md',
  'documentation/scenario-guides/CATALOG.md',
  'documentation/scenario-guides/zero-to-hero/index.md',
  'documentation/scenario-guides/zero-to-hero/README.md',
  'documentation/scenario-guides/quick-reference/index.md',
  'documentation/scenario-guides/quick-reference/README.md',
  'documentation/modules/index.md',
  'documentation/modules/MODULE_INSTANCES_INDEX.md',
  'documentation/platform/ARCHITECTURE.md',
  'documentation/platform/DETECTION_AND_OBSERVABILITY.md',
  'documentation/platform/OPERATIONS.md',
  'documentation/platform/TOOLING.md',
  'documentation/platform/QUICK_REFERENCE.md',
  'documentation/platform/DASHBOARD.md',
  'documentation/getting-started/FULL_STACK_SETUP.md',
  'documentation/getting-started/ZERO_TO_HERO.md',
  'documentation/learning-path/index.md',
  'documentation/learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md',
  'documentation/guides/index.md',
  'documentation/guides/FLOCI_INTEGRATION.md',
  // documentation/talks/* is gitignored (local talk drafts) — not a CI surface
];

function checkProseCounts(expectedCount, maxId) {
  const expectedStr = String(expectedCount);

  for (const relPath of SURFACE_FILES) {
    const filePath = path.join(ROOT, relPath);
    if (!exists(filePath)) {
      fail(`${relPath}: missing (listed as a consistency surface)`);
      continue;
    }
    const text = read(filePath);

    for (const { re, label } of TOTAL_COUNT_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const got = m[1];
        // Ignore SVG viewBox / icon "24" noise in HTML via hero-stat / landing only;
        // "hands-on" can match unrelated marketing — require nearby lab context below.
        if (label === 'hands-on') {
          const start = Math.max(0, m.index - 40);
          const window = text.slice(start, m.index + m[0].length + 40).toLowerCase();
          if (!/lab|scenario|attack/.test(window)) continue;
        }
        if (got !== expectedStr) {
          fail(`${relPath}: ${label} claims ${got}, expected ${expectedStr} (match: ${JSON.stringify(m[0])})`);
        }
      }
    }

    for (const { re, label } of RANGE_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const end = m[1];
        if (end !== maxId) {
          fail(`${relPath}: ${label} ends at ${end}, expected ${maxId} (match: ${JSON.stringify(m[0])})`);
        }
      }
    }

    let savedHits = 0;
    for (const re of SAVED_SEARCHES_RES) {
      re.lastIndex = 0;
      let sm;
      while ((sm = re.exec(text)) !== null) {
        savedHits += 1;
        const got = Number(sm[1]);
        const want = expectedCount * 2;
        if (got !== want) {
          fail(`${relPath}: saved searches claims ${got}, expected ${want} (2× ${expectedCount} labs)`);
        }
      }
    }
    if (relPath === 'observability/README.md' && savedHits === 0) {
      fail(
        'observability/README.md: missing saved-searches count (expected **NN saved searches** or **NN** saved searches)'
      );
    }
  }
}

function checkStructural(scenarios) {
  const ids = scenarios.map((s) => s.id);
  const idSet = new Set(ids);

  for (const s of scenarios) {
    for (const req of ['README.md', 'DETECT.md', 'setup.sh']) {
      const p = path.join(s.full, req);
      if (!exists(p)) fail(`${s.dir}: missing ${req}`);
    }
  }
  ok(`all ${scenarios.length} scenario folders have README.md, DETECT.md, setup.sh`);

  const catalogPath = path.join(ROOT, 'documentation/scenario-guides/CATALOG.md');
  const catalogIds = extractIds(read(catalogPath), [/^\|\s*(\d{2})\s*\|/gm]);
  const catalogMissing = missingIds(catalogIds, ids);
  if (catalogMissing.length) fail(`CATALOG.md missing scenario rows: ${catalogMissing.join(', ')}`);
  else ok('CATALOG.md lists every scenario id');

  const z2hIndex = path.join(ROOT, 'documentation/scenario-guides/zero-to-hero/index.md');
  const z2hText = read(z2hIndex);
  const z2hMissing = ids.filter((id) => !z2hText.includes(`ZERO_TO_HERO_SCENARIO_${id}.md`));
  if (z2hMissing.length) fail(`zero-to-hero/index.md missing links: ${z2hMissing.join(', ')}`);
  else ok('zero-to-hero/index.md links every scenario');

  for (const id of ids) {
    const p = path.join(ROOT, `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_${id}.md`);
    if (!exists(p)) fail(`missing walkthrough ZERO_TO_HERO_SCENARIO_${id}.md`);
  }

  // Injected sections must appear exactly once — regenerators used to stack duplicates.
  {
    const obsRe = /^## Elasticsearch \+ Kibana observability \(optional\)\s*$/gm;
    const codeRe = /^## Code-level workflow\s*$/gm;
    const dups = [];
    for (const id of ids) {
      const p = path.join(ROOT, `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_${id}.md`);
      if (!exists(p)) continue;
      const text = read(p);
      const obsCount = (text.match(obsRe) || []).length;
      const codeCount = (text.match(codeRe) || []).length;
      if (obsCount !== 1) dups.push(`${id}:obs=${obsCount}`);
      if (codeCount !== 1) dups.push(`${id}:codeflow=${codeCount}`);
    }
    if (dups.length) fail(`zero-to-hero duplicate/missing injected sections: ${dups.join(', ')}`);
    else ok('zero-to-hero guides have exactly one observability + one codeflow section');
  }

  const qrIndex = path.join(ROOT, 'documentation/scenario-guides/quick-reference/index.md');
  const qrText = read(qrIndex);
  const qrMissing = ids.filter((id) => !qrText.includes(`QUICK_REFERENCE_SCENARIO_${id}.md`));
  if (qrMissing.length) fail(`quick-reference/index.md missing links: ${qrMissing.join(', ')}`);
  else ok('quick-reference/index.md links every scenario');

  for (const id of ids) {
    const p = path.join(ROOT, `documentation/scenario-guides/quick-reference/QUICK_REFERENCE_SCENARIO_${id}.md`);
    if (!exists(p)) fail(`missing quick-ref QUICK_REFERENCE_SCENARIO_${id}.md`);
  }

  const modIndex = path.join(ROOT, 'documentation/modules/index.md');
  const modText = read(modIndex);
  const modMissing = ids.filter((id) => !modText.includes(`MODULE_INSTANCE_SCENARIO_${id}.md`));
  if (modMissing.length) fail(`modules/index.md missing links: ${modMissing.join(', ')}`);
  else ok('modules/index.md links every scenario');

  const modInst = path.join(ROOT, 'documentation/modules/MODULE_INSTANCES_INDEX.md');
  const modInstText = read(modInst);
  const modInstMissing = ids.filter(
    (id) => !modInstText.includes(`MODULE_INSTANCE_SCENARIO_${id}.md`)
  );
  if (modInstMissing.length) {
    fail(`MODULE_INSTANCES_INDEX.md missing links: ${modInstMissing.join(', ')}`);
  } else {
    ok('MODULE_INSTANCES_INDEX.md links every scenario');
  }

  for (const id of ids) {
    const p = path.join(ROOT, `documentation/modules/MODULE_INSTANCE_SCENARIO_${id}.md`);
    if (!exists(p)) fail(`missing module MODULE_INSTANCE_SCENARIO_${id}.md`);
  }

  const { PLAYBOOKS } = require('../lib/mitigation-playbooks.js');
  const playbookIds = new Set(Object.keys(PLAYBOOKS));
  const pbMissing = missingIds(playbookIds, ids);
  if (pbMissing.length) fail(`mitigation-playbooks.js missing keys: ${pbMissing.join(', ')}`);
  else ok('mitigation-playbooks.js has a key for every scenario');

  const registryPath = path.join(ROOT, 'apps/control-plane/src/registry/scenarios.ts');
  if (exists(registryPath)) {
    const regText = read(registryPath);
    // Most labs use baseScenario('NN', ...); 06/22 are inline objects with id: 'NN'.
    const regIds = extractIds(regText, [
      /baseScenario\(\s*'(\d{2})'/g,
      /^\s*id:\s*'(\d{2})'\s*,/gm,
    ]);
    const regMissing = missingIds(regIds, ids);
    if (regMissing.length) {
      fail(`control-plane scenarios.ts missing scenario ids: ${regMissing.join(', ')}`);
    } else {
      ok('control-plane registry lists every scenario id');
    }
  }

  const manifestPath = path.join(ROOT, 'docs/docs-manifest.json');
  if (exists(manifestPath)) {
    const manifest = read(manifestPath);
    const manMissing = ids.filter(
      (id) => !manifest.includes(`ZERO_TO_HERO_SCENARIO_${id}.md`)
    );
    if (manMissing.length) {
      fail(`docs/docs-manifest.json missing zero-to-hero entries: ${manMissing.join(', ')}`);
    } else {
      ok('docs/docs-manifest.json includes every zero-to-hero scenario');
    }
  }

  // README scenario table should include every id
  const readme = read(path.join(ROOT, 'README.md'));
  const readmeMissing = ids.filter((id) => {
    const re = new RegExp(`^\\|\\s*${id}\\s*\\|`, 'm');
    return !re.test(readme);
  });
  if (readmeMissing.length) fail(`README.md scenario table missing: ${readmeMissing.join(', ')}`);
  else ok('README.md scenario table lists every scenario');

  // Same-file contradiction: two different "all N scenarios/labs" totals
  for (const relPath of SURFACE_FILES) {
    const filePath = path.join(ROOT, relPath);
    if (!exists(filePath)) continue;
    const text = read(filePath);
    const totals = new Set();
    for (const { re } of TOTAL_COUNT_PATTERNS) {
      if (re.source.includes('hero-stat') || re.source.includes('expected')) continue;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (re.source.includes('hands-on')) {
          const start = Math.max(0, m.index - 40);
          const window = text.slice(start, m.index + m[0].length + 40).toLowerCase();
          if (!/lab|scenario|attack/.test(window)) continue;
        }
        totals.add(m[1]);
      }
    }
    if (totals.size > 1) {
      fail(`${relPath}: contradictory total-count claims in one file: ${[...totals].join(', ')}`);
    }
  }
  if (!failures.some((f) => f.includes('contradictory total-count'))) {
    ok('no same-file contradictory total-count claims on surfaces');
  }

  return idSet;
}


function checkLandingScenarioCards(scenarios) {
  const relPath = 'docs/index.html';
  const filePath = path.join(ROOT, relPath);
  if (!exists(filePath)) {
    fail(`${relPath}: missing`);
    return;
  }
  const text = read(filePath);
  const ids = scenarios.map((s) => s.id);
  const found = [];
  const re = /<span class="scenario-number">(\d{2})<\/span>/g;
  let m;
  while ((m = re.exec(text)) !== null) found.push(m[1]);
  const uniq = [...new Set(found)];
  if (found.length !== ids.length) {
    fail(
      `${relPath}: scenario-card numbers count ${found.length}, expected ${ids.length} (found ${found.join(', ') || 'none'})`,
    );
  } else if (uniq.length !== ids.length) {
    fail(`${relPath}: duplicate or incomplete scenario-number set: ${found.join(', ')}`);
  } else {
    const missing = ids.filter((id) => !uniq.includes(id));
    if (missing.length) fail(`${relPath}: scenario cards missing ids: ${missing.join(', ')}`);
    else ok(`${relPath} scenario cards cover every on-disk lab (${ids.length})`);
  }
}

function checkZeroToHeroGuideQuality(scenarios) {
  const emptyHeading = [];
  const missingLessonFields = [];
  const missingFloci = [];

  for (const s of scenarios) {
    const z2h = path.join(ROOT, `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_${s.id}.md`);
    if (exists(z2h)) {
      const text = read(z2h);
      // Empty section: heading then another ## with only blank lines between
      const emptyRe =
        /^## (Mitigation Playbook|Straightforward Implementation)\s*\n+(?=## )/gm;
      let em;
      while ((em = emptyRe.exec(text)) !== null) {
        emptyHeading.push(`${s.id}:${em[1]}`);
      }
      // Duplicate TOC heading is a common inject failure mode
      const tocCount = (text.match(/^## Table of Contents\s*$/gm) || []).length;
      if (tocCount !== 1) emptyHeading.push(`${s.id}:Table of Contents x${tocCount}`);
    }

    const lesson = path.join(s.full, 'lesson.yaml');
    if (exists(lesson)) {
      const ly = read(lesson);
      if (!/^caseStudy:\s*.+/m.test(ly)) missingLessonFields.push(`${s.id}:caseStudy`);
      if (!/^mitigation:\s*$/m.test(ly) && !/^mitigation:\s*\[/m.test(ly)) {
        // list form starts with mitigation: then indented dashes
        if (!/^mitigation:\s*\n(\s+-\s+.+)/m.test(ly)) missingLessonFields.push(`${s.id}:mitigation`);
      }
    } else {
      missingLessonFields.push(`${s.id}:lesson.yaml`);
    }

    const floci = path.join(s.full, 'FLOCI.md');
    if (!exists(floci)) missingFloci.push(s.id);
  }

  if (emptyHeading.length) {
    fail(
      `zero-to-hero empty/broken sections (fill Mitigation Playbook + Straightforward Implementation; one TOC): ${emptyHeading.join(', ')}`,
    );
  } else {
    ok('zero-to-hero guides have non-empty Mitigation Playbook + Straightforward Implementation');
  }

  if (missingLessonFields.length) {
    fail(
      `lesson.yaml missing caseStudy/mitigation quick-reference fields: ${missingLessonFields.join(', ')}`,
    );
  } else {
    ok('every scenario lesson.yaml has caseStudy + mitigation');
  }

  if (missingFloci.length) {
    fail(`missing FLOCI.md for scenarios: ${missingFloci.join(', ')}`);
  } else {
    ok('every scenario folder has FLOCI.md');
  }
}

/** Mermaid sequence + SVG chips share these participant ids — no undeclared C2 etc. */
const DIAGRAM_ACTORS = new Set(['Learner', 'Victim', 'MalPkg', 'Mock', 'ES', 'Kibana']);

function checkDiagramStepActors(scenarios) {
  const stepsPath = path.join(ROOT, 'detection-tools/es/scenario-diagram-steps.js');
  const metaPath = path.join(ROOT, 'detection-tools/es/scenario-observability.json');
  if (!exists(stepsPath) || !exists(metaPath)) {
    fail('missing scenario-diagram-steps.js or scenario-observability.json');
    return;
  }
  const { SCENARIO_DIAGRAMS } = require(stepsPath);
  const meta = JSON.parse(read(metaPath));
  const metaIds = meta.map((s) => s.scenario_id);
  const diskIds = scenarios.map((s) => s.id);

  const metaMissing = missingIds(new Set(metaIds), diskIds);
  if (metaMissing.length) fail(`scenario-observability.json missing ids: ${metaMissing.join(', ')}`);
  else ok('scenario-observability.json covers every on-disk scenario');

  const stepMissing = diskIds.filter((id) => !SCENARIO_DIAGRAMS[id]);
  if (stepMissing.length) {
    fail(`scenario-diagram-steps.js missing SCENARIO_DIAGRAMS entries: ${stepMissing.join(', ')}`);
  } else {
    ok('scenario-diagram-steps.js has attack_steps for every scenario');
  }

  const bad = [];
  for (const id of diskIds) {
    const entry = SCENARIO_DIAGRAMS[id];
    if (!entry || !Array.isArray(entry.attack_steps)) continue;
    for (const step of entry.attack_steps) {
      if (!DIAGRAM_ACTORS.has(step.from) || !DIAGRAM_ACTORS.has(step.to)) {
        bad.push(`${id}: ${step.from}→${step.to}`);
      }
    }
  }
  if (bad.length) {
    fail(
      `diagram attack_steps use undeclared actors (allowed: ${[...DIAGRAM_ACTORS].join(', ')}): ${bad.join('; ')}`
    );
  } else {
    ok('diagram attack_steps use only Learner/Victim/MalPkg/Mock/ES/Kibana');
  }

  for (const row of meta) {
    const folder = path.join(ROOT, 'scenarios', row.folder);
    if (!exists(folder)) fail(`scenario-observability.json folder missing: ${row.folder}`);
  }
  ok('scenario-observability.json folders exist on disk');
}

function main() {
  const scenarios = discoverScenarios();
  if (scenarios.length === 0) {
    console.error('FAIL: no scenarios/NN-* directories found');
    process.exit(1);
  }

  const count = scenarios.length;
  const maxId = scenarios[scenarios.length - 1].id;
  const expectedIds = scenarios.map((s) => s.id);
  // Contiguous ids from 01..max (catches gaps like missing folder 06 while claiming 23 labs).
  const contiguous = [];
  for (let i = 1; i <= Number(maxId); i += 1) contiguous.push(String(i).padStart(2, '0'));
  const gaps = contiguous.filter((id) => !expectedIds.includes(id));
  if (gaps.length) {
    fail(`scenario id gaps on disk (folder missing): ${gaps.join(', ')}`);
  } else {
    ok(`scenario ids are contiguous ${scenarios[0].id}–${maxId}`);
  }

  console.log(`Truth: ${count} scenarios on disk (ids ${scenarios[0].id}–${maxId})`);
  console.log('');

  checkStructural(scenarios);
  checkLandingScenarioCards(scenarios);
  checkZeroToHeroGuideQuality(scenarios);
  checkDiagramStepActors(scenarios);
  console.log('');
  checkProseCounts(count, maxId);

  if (failures.length) {
    console.log('');
    console.log(`Summary: ${passes.length} pass, ${failures.length} fail`);
    console.error('');
    console.error('Info consistency check failed. When adding a scenario NN-slug, update:');
    console.error('  - scenarios/NN-slug/{README,DETECT,setup,lesson.yaml,FLOCI}.md (+ caseStudy/mitigation in lesson.yaml)');
    console.error('  - README + AUTHORS + docs/index.html (hero counts + scenario cards 01..NN) + docs/guide.html');
    console.error('  - docs/docs-manifest.json + documentation indexes (CATALOG, zero-to-hero, quick-ref, modules)');
    console.error('  - ZERO_TO_HERO_SCENARIO_NN.md with real Mitigation Playbook + Straightforward Implementation');
    console.error('  - observability counts (DETECT runbooks, 2× saved searches) + diagram specs');
    console.error('  - scripts/lib/mitigation-playbooks.js + apps/control-plane registry');
    console.error('Then re-run: node scripts/docs/check-info-consistency.js');
    process.exit(1);
  }
  ok(`public facts match ${count} on-disk labs`);
  console.log('');
  console.log(`Summary: ${passes.length} pass, ${failures.length} fail`);
  process.exit(0);
}

main();
