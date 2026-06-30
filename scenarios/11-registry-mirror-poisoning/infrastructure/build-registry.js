#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Builds the poisoned registry data for Scenario 11.
 *
 * For each package in compromised-mirror/:
 *   1. Runs `npm pack` to produce a real .tgz tarball.
 *   2. Computes SHA-1 (shasum) and SHA-512 (integrity) for the tarball.
 *   3. Writes npm registry-protocol metadata to work/registry-meta.json.
 *
 * The companion registry-server.js loads that JSON at startup and serves
 * packages to `npm install --registry http://localhost:4873/`.
 *
 * Usage:  node infrastructure/build-registry.js
 */

'use strict';

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const SCENARIO_DIR  = path.join(__dirname, '..');
const MIRROR_DIR    = path.join(SCENARIO_DIR, 'compromised-mirror');
const WORK_DIR      = path.join(SCENARIO_DIR, 'work');
const TARBALLS_DIR  = path.join(WORK_DIR, 'tarballs');
const REGISTRY_PORT = 4873;

fs.mkdirSync(TARBALLS_DIR, { recursive: true });

// Clear any stale tarballs
for (const f of fs.readdirSync(TARBALLS_DIR)) {
  if (f.endsWith('.tgz')) fs.unlinkSync(path.join(TARBALLS_DIR, f));
}

const registryMeta = {};

const pkgDirs = fs.readdirSync(MIRROR_DIR)
  .filter(d => {
    const full = path.join(MIRROR_DIR, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'package.json'));
  });

for (const dir of pkgDirs) {
  const pkgDir  = path.join(MIRROR_DIR, dir);
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const name    = pkgJson.name;       // e.g. "enterprise-utils"
  const version = pkgJson.version;   // e.g. "1.0.0"

  console.log(`[build-registry] Packing ${name}@${version}…`);

  // npm pack produces <unscoped-name>-<version>.tgz in the destination dir.
  // For unscoped packages: enterprise-utils-1.0.0.tgz
  execSync(`npm pack --pack-destination "${TARBALLS_DIR}"`, {
    cwd:   pkgDir,
    stdio: 'pipe',
  });

  // Locate the generated tarball (npm pack may add hyphens for scope)
  const unscopedName = name.replace(/^@[^/]+\//, '');    // strip @scope/
  const scopePrefix  = name.startsWith('@')
    ? name.split('/')[0].slice(1) + '-'
    : '';
  // npm pack filename: <scope->unscopedname-version.tgz
  const npmPackName  = `${scopePrefix}${unscopedName}-${version}.tgz`;
  // Registry convention: just <unscopedname>-<version>.tgz
  const regTarName   = `${unscopedName}-${version}.tgz`;

  const srcPath = path.join(TARBALLS_DIR, npmPackName);
  const dstPath = path.join(TARBALLS_DIR, regTarName);

  if (!fs.existsSync(srcPath)) {
    // Try to find any .tgz that includes the version
    const found = fs.readdirSync(TARBALLS_DIR).find(f => f.includes(version) && f.endsWith('.tgz'));
    if (!found) { console.error(`[build-registry] ❌ tarball not found for ${name}@${version}`); continue; }
    fs.renameSync(path.join(TARBALLS_DIR, found), dstPath);
  } else if (srcPath !== dstPath) {
    fs.renameSync(srcPath, dstPath);
  }

  const tarData  = fs.readFileSync(dstPath);
  const shasum   = crypto.createHash('sha1').update(tarData).digest('hex');
  const integrity = 'sha512-' + crypto.createHash('sha512').update(tarData).digest('base64');
  const tarballUrl = `http://localhost:${REGISTRY_PORT}/${name}/-/${regTarName}`;

  // Build npm registry-protocol metadata for this package
  registryMeta[name] = {
    _id:  name,
    name,
    description: pkgJson.description || '',
    'dist-tags': { latest: version },
    versions: {
      [version]: {
        ...pkgJson,
        _id: `${name}@${version}`,
        dist: { tarball: tarballUrl, shasum, integrity },
      },
    },
  };

  console.log(`[build-registry] ✅ ${name}@${version} → ${regTarName}`);
}

const metaPath = path.join(WORK_DIR, 'registry-meta.json');
fs.writeFileSync(metaPath, JSON.stringify(registryMeta, null, 2));

console.log(`\n[build-registry] Packages indexed: ${Object.keys(registryMeta).join(', ')}`);
console.log(`[build-registry] Metadata: ${metaPath}`);
console.log('[build-registry] Start the mirror: node infrastructure/registry-server.js');
