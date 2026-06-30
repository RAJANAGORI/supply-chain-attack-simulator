#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Signs a package directory using the lab's Ed25519 private key.
 * Computes a SHA-256 content hash over all package files, signs that hash,
 * and writes a package.sig JSON file alongside the package.
 *
 * Usage:
 *   node infrastructure/sign-package.js <pkg-dir> [label]
 *
 * Examples:
 *   node infrastructure/sign-package.js legitimate-package/secure-utils "v1.0.0 [LEGITIMATE]"
 *   node infrastructure/sign-package.js compromised-package/secure-utils "v1.0.1 [ATTACKER — same stolen key]"
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Compute a deterministic SHA-256 hash of a package directory.
 * Sorts files alphabetically, excludes package.sig itself.
 */
function packageContentHash(pkgDir) {
  const files = fs.readdirSync(pkgDir)
    .filter(f => f !== 'package.sig')
    .sort();

  const h = crypto.createHash('sha256');
  for (const f of files) {
    const fp = path.join(pkgDir, f);
    if (!fs.statSync(fp).isFile()) continue;
    // Include filename so a file rename still changes the hash
    h.update(`${f}\0`);
    h.update(fs.readFileSync(fp));
    h.update('\0');
  }
  return h.digest('hex');
}

const pkgDir  = process.argv[2];
const label   = process.argv[3] || path.basename(pkgDir);

if (!pkgDir || !fs.existsSync(pkgDir)) {
  console.error('Usage: node sign-package.js <pkg-dir> [label]');
  process.exit(1);
}

const keysDir     = path.join(__dirname, 'keys');
const privKeyPath = path.join(keysDir, 'private.pem');
const keyInfoPath = path.join(keysDir, 'key-info.json');

if (!fs.existsSync(privKeyPath)) {
  console.error('Private key not found. Run: node infrastructure/keygen.js');
  process.exit(1);
}

const privateKey = fs.readFileSync(privKeyPath);
const keyInfo    = JSON.parse(fs.readFileSync(keyInfoPath, 'utf8'));

const contentHash = packageContentHash(pkgDir);
// Ed25519 sign: algorithm arg is null (key type determines hash internally)
const signature   = crypto.sign(null, Buffer.from(contentHash, 'hex'), privateKey);

const sigData = {
  algorithm:    'Ed25519',
  keyId:        keyInfo.keyId,
  keyFingerprint: keyInfo.fingerprint,
  signedBy:     keyInfo.owner,
  label,
  contentHash,
  signature:    signature.toString('base64'),
  signedAt:     new Date().toISOString(),
};

fs.writeFileSync(path.join(pkgDir, 'package.sig'), JSON.stringify(sigData, null, 2));
console.log(`[sign] ${label}`);
console.log(`       contentHash = ${contentHash.slice(0, 32)}…`);
console.log(`       → package.sig written to ${pkgDir}/`);
