#!/usr/bin/env node
/**
 * Lightweight static scan of a project's node_modules for suspicious patterns.
 * Usage: node package-security-scanner.js <projectRoot>
 */

const fs = require('fs');
const path = require('path');

const SUSPICIOUS = [
  /require\s*\(\s*['"]https?['"]\)/,
  /\.request\s*\(/,
  /child_process/,
  /eval\s*\(/,
  /Function\s*\(/,
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') {
        walk(full, out);
      } else if (!ent.name.startsWith('.')) {
        walk(full, out);
      }
    } else if (ent.isFile() && ent.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function scanFile(filePath) {
  const rel = path.relative(process.cwd(), filePath);
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const hits = [];
  for (const pattern of SUSPICIOUS) {
    if (pattern.test(content)) {
      hits.push(pattern.toString());
    }
  }
  return hits.length ? [{ rel, hits }] : [];
}

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const nm = path.join(root, 'node_modules');

if (!fs.existsSync(nm)) {
  console.error(`No node_modules at ${nm}. Run npm install in the app first.`);
  process.exit(1);
}

console.log(`🔍 Scanning .js under ${nm} (may take a moment)...\n`);

const files = walk(nm);
const report = [];
for (const f of files) {
  report.push(...scanFile(f));
}

if (report.length === 0) {
  console.log('No suspicious patterns matched (heuristic scan only — not exhaustive).');
  process.exit(0);
}

console.log('⚠️  Files with suspicious patterns (review manually):\n');
for (const item of report) {
  console.log(item.rel);
  item.hits.forEach((h) => console.log(`   - ${h}`));
  console.log('');
}
