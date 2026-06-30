#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Builds the fake "public" npm registry data for Scenario 02.
 *
 * Packs attacker-packages/@techcorp/auth-lib@999.999.999 into a real .tgz,
 * computes npm integrity hashes, and writes work/registry-meta.json so the
 * companion registry-server.js can serve it at http://localhost:4874/.
 *
 * Usage:  node infrastructure/build-registry.js
 */

'use strict';

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const SCENARIO_DIR  = path.join(__dirname, '..');
const REGISTRY_PORT = 4874;
const WORK_DIR      = path.join(SCENARIO_DIR, 'work');
const TARBALLS_DIR  = path.join(WORK_DIR, 'tarballs');

fs.mkdirSync(TARBALLS_DIR, { recursive: true });

// Clear stale tarballs
for (const f of fs.readdirSync(TARBALLS_DIR)) {
  if (f.endsWith('.tgz')) fs.unlinkSync(path.join(TARBALLS_DIR, f));
}

// Packages the attacker has published to the fake "public" registry
const ATTACKER_PACKAGES = [
  path.join(SCENARIO_DIR, 'attacker-packages/@techcorp/auth-lib'),
];

const registryMeta = {};

for (const pkgDir of ATTACKER_PACKAGES) {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const name    = pkgJson.name;     // @techcorp/auth-lib
  const version = pkgJson.version;  // 999.999.999

  console.log(`[build-registry] Packing ${name}@${version}…`);

  execSync(`npm pack --pack-destination "${TARBALLS_DIR}"`, {
    cwd:   pkgDir,
    stdio: 'pipe',
  });

  // npm pack for @techcorp/auth-lib produces: techcorp-auth-lib-999.999.999.tgz
  // npm registry convention for scoped packages uses only the unscoped name:
  //   tarball URL: /@techcorp/auth-lib/-/auth-lib-999.999.999.tgz
  const unscopedName = name.replace(/^@[^/]+\//, '');       // auth-lib
  const scopePrefix  = name.startsWith('@')
    ? name.split('/')[0].slice(1) + '-'                      // techcorp-
    : '';
  const npmPackName  = `${scopePrefix}${unscopedName}-${version}.tgz`;  // techcorp-auth-lib-999.999.999.tgz
  const regTarName   = `${unscopedName}-${version}.tgz`;                // auth-lib-999.999.999.tgz

  const srcPath = path.join(TARBALLS_DIR, npmPackName);
  const dstPath = path.join(TARBALLS_DIR, regTarName);

  if (!fs.existsSync(srcPath)) {
    const found = fs.readdirSync(TARBALLS_DIR).find(f => f.includes(version) && f.endsWith('.tgz'));
    if (!found) { console.error(`[build-registry] ❌ tarball not found for ${name}@${version}`); continue; }
    fs.renameSync(path.join(TARBALLS_DIR, found), dstPath);
  } else if (srcPath !== dstPath) {
    fs.renameSync(srcPath, dstPath);
  }

  const tarData   = fs.readFileSync(dstPath);
  const shasum    = crypto.createHash('sha1').update(tarData).digest('hex');
  const integrity = 'sha512-' + crypto.createHash('sha512').update(tarData).digest('base64');
  const tarballUrl = `http://localhost:${REGISTRY_PORT}/${name}/-/${regTarName}`;

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

console.log(`\n[build-registry] Attacker packages indexed: ${Object.keys(registryMeta).join(', ')}`);
console.log(`[build-registry] Metadata: ${metaPath}`);
console.log('[build-registry] Start the fake registry: node infrastructure/registry-server.js');
