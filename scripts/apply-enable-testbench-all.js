#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCENARIOS = path.join(ROOT, 'scenarios');
const SHARED_JS = path.join(SCENARIOS, '_shared', 'testbench-env.js');

const ENABLE_BLOCK = `SCENARIO_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "\${SCENARIO_DIR}/../_shared/enable-testbench.sh"

`;

const WARN_PATTERNS = [
  /# Check if TESTBENCH_MODE is enabled\r?\nif \[ "\$TESTBENCH_MODE" != "enabled" \]; then[\s\S]*?\r?\nfi\r?\n\r?\n/g,
  /if \[\[ "\$\{TESTBENCH_MODE:-\}" != "enabled" \]\]; then[\s\S]*?\r?\nfi\r?\n\r?\n/g,
  /if \[ "\$\{TESTBENCH_MODE:-\}" != "enabled" \]; then[\s\S]*?\r?\nfi\r?\n\r?\n/g,
  /if \[ "\$TESTBENCH_MODE" != "enabled" \]; then[\s\S]*?\r?\nfi\r?\n\r?\n/g,
];

const DUPLICATE_ENABLE_PATTERNS = [
  /REPO_ROOT="\$\(cd "\$\{ROOT_DIR\}\/\.\.\/\.\." && pwd\)"\r?\nif \[\[ -f "\$\{REPO_ROOT\}\/\.testbench\.env" \]\]; then[\s\S]*?\r?\nfi\r?\nexport TESTBENCH_MODE=enabled\r?\n\r?\n/g,
  /REPO_ROOT="\$\(cd "\$\{ROOT_DIR\}\/\.\.\/\.\." && pwd\)"\r?\nif \[\[ -f "\$\{REPO_ROOT\}\/\.testbench\.env" \]\]; then[\s\S]*?\r?\nfi\r?\n\r?\n/g,
];

function stripEnableBlocks(content) {
  let next = content;
  next = next.replace(
    /(?:ROOT_DIR|SCRIPT_DIR)="?\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)" && pwd\)"?\r?\nSCENARIO_DIR="\$\{(?:ROOT_DIR|SCRIPT_DIR)\}"\r?\n# shellcheck disable=SC1091\r?\nsource "\$\{SCENARIO_DIR\}\/\.\.\/_shared\/enable-testbench\.sh"\r?\n\r?\n/g,
    ''
  );
  next = next.replace(
    /SCENARIO_DIR="\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)" && pwd\)"\r?\ncd "\$\{SCENARIO_DIR\}"\r?\n# shellcheck disable=SC1091\r?\nsource "\$\{SCENARIO_DIR\}\/\.\.\/_shared\/enable-testbench\.sh"\r?\n\r?\n/g,
    ''
  );
  next = next.replace(/^cd "\$\{ROOT_DIR\}"\r?\n\r?\n/m, '');
  return next;
}

function patchSetup(content) {
  let next = content;
  for (const pattern of WARN_PATTERNS) {
    next = next.replace(pattern, '');
  }
  for (const pattern of DUPLICATE_ENABLE_PATTERNS) {
    next = next.replace(pattern, '');
  }
  next = next.replace(
    /echo ""\r?\necho "TESTBENCH_MODE=enabled for this shell\.[^\n]*"\r?\n/g,
    '\n'
  );

  next = stripEnableBlocks(next);

  const headerMatch = next.match(/^((?:#!.*\r?\n)?(?:#[^\n]*\r?\n)*)/);
  const header = headerMatch ? headerMatch[1] : '';
  const body = headerMatch ? next.slice(header.length) : next;
  next = header + ENABLE_BLOCK + body.replace(/^\r?\n+/, '');
  next = next.replace(/^cd "\$\{ROOT_DIR\}"\r?\n\r?\n/m, '');
  return next;
}

function sharedRequirePath(pkgFile) {
  return path
    .relative(path.dirname(pkgFile), SHARED_JS)
    .split(path.sep)
    .join('/');
}

function patchPackageJson(file) {
  if (!fs.existsSync(file)) return false;
  const raw = fs.readFileSync(file, 'utf8');
  const pkg = JSON.parse(raw);
  if (!pkg.scripts || !pkg.scripts.start) return false;

  const start = pkg.scripts.start;
  const nodeMatch = start.match(/^node(?: -r \S+)? (.+)$/);
  if (!nodeMatch) return false;

  const requirePath = sharedRequirePath(file);
  const nextStart = `node -r ${requirePath} ${nodeMatch[1]}`;
  if (start === nextStart) return false;

  pkg.scripts.start = nextStart;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  return true;
}

const LEARNER_APP_PATHS = [
  'victim-app/package.json',
  'corporate-app/package.json',
  'legitimate-app/package.json',
  'compromised-app/package.json',
  'compromised-build/package.json',
];

let setupCount = 0;
for (const dir of fs.readdirSync(SCENARIOS).filter((n) => /^\d{2}-/.test(n))) {
  const setupPath = path.join(SCENARIOS, dir, 'setup.sh');
  if (!fs.existsSync(setupPath)) continue;
  const before = fs.readFileSync(setupPath, 'utf8');
  const after = patchSetup(before);
  if (after !== before) {
    fs.writeFileSync(setupPath, after);
    setupCount += 1;
    console.log('setup:', dir);
  }
}

let pkgCount = 0;
for (const dir of fs.readdirSync(SCENARIOS).filter((n) => /^\d{2}-/.test(n))) {
  for (const rel of LEARNER_APP_PATHS) {
    const pkgPath = path.join(SCENARIOS, dir, rel);
    if (patchPackageJson(pkgPath)) {
      pkgCount += 1;
      console.log('package:', path.join(dir, rel));
    }
  }
}

console.log(`Done: ${setupCount} setup.sh, ${pkgCount} package.json`);
