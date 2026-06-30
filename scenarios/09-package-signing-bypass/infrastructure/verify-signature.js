#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Verifies the Ed25519 signature on a package directory.
 *
 * DEMONSTRATES THE ATTACK:
 *   Run against BOTH the legitimate and the compromised package — BOTH pass
 *   cryptographic verification. The signing key is the same (it was stolen).
 *   Signature validity alone is NOT sufficient when a key is compromised.
 *
 * Usage:
 *   node infrastructure/verify-signature.js <pkg-dir>
 *
 * Examples:
 *   node infrastructure/verify-signature.js legitimate-package/secure-utils
 *   node infrastructure/verify-signature.js compromised-package/secure-utils
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function packageContentHash(pkgDir) {
  const files = fs.readdirSync(pkgDir)
    .filter(f => f !== 'package.sig')
    .sort();
  const h = crypto.createHash('sha256');
  for (const f of files) {
    const fp = path.join(pkgDir, f);
    if (!fs.statSync(fp).isFile()) continue;
    h.update(`${f}\0`);
    h.update(fs.readFileSync(fp));
    h.update('\0');
  }
  return h.digest('hex');
}

const pkgDir = process.argv[2];
if (!pkgDir || !fs.existsSync(pkgDir)) {
  console.error('Usage: node verify-signature.js <pkg-dir>');
  process.exit(1);
}

const keysDir    = path.join(__dirname, 'keys');
const pubKeyPath = path.join(keysDir, 'public.pem');
if (!fs.existsSync(pubKeyPath)) {
  console.error('Public key not found. Run: node infrastructure/keygen.js');
  process.exit(1);
}

const publicKey  = fs.readFileSync(pubKeyPath);
const sigPath    = path.join(pkgDir, 'package.sig');
const sep        = '='.repeat(60);

console.log(`\n${sep}`);
console.log(`Package directory: ${pkgDir}`);
console.log(sep);

if (!fs.existsSync(sigPath)) {
  console.log('❌  NO SIGNATURE — package.sig not found (unsigned package)');
  console.log(sep);
  process.exit(1);
}

const sigData      = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
const currentHash  = packageContentHash(pkgDir);
const sigBuf       = Buffer.from(sigData.signature, 'base64');

// Real Ed25519 verification
const sigValid = crypto.verify(
  null,
  Buffer.from(sigData.contentHash, 'hex'),
  publicKey,
  sigBuf
);

// Content integrity: does the current content match what was signed?
const contentUnchanged = sigData.contentHash === currentHash;

const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

console.log(`\nPackage:        ${pkgJson.name}@${pkgJson.version}`);
console.log(`Label:          ${sigData.label}`);
console.log(`Key ID:         ${sigData.keyId}`);
console.log(`Fingerprint:    ${sigData.keyFingerprint.slice(0, 47)}…`);
console.log(`Signed by:      ${sigData.signedBy}`);
console.log(`Signed at:      ${sigData.signedAt}`);
console.log(`\nContent hash (at signing): ${sigData.contentHash.slice(0, 32)}…`);
console.log(`Content hash (now):        ${currentHash.slice(0, 32)}…`);

console.log('\n--- Verification ---');
console.log(`Cryptographic signature: ${sigValid ? '✅  VALID'  : '❌  INVALID'}`);
console.log(`Content unchanged:       ${contentUnchanged ? '✅  YES' : '⚠️   NO — content differs from signed version'}`);

if (pkgJson.scripts && pkgJson.scripts.postinstall) {
  console.log('\n⚠️   WARNING: This package has a postinstall script.');
  console.log('    Even a cryptographically valid signature does NOT guarantee the script is safe');
  console.log('    when the signing key has been compromised. Review postinstall.js before installing!');
}

if (sigValid) {
  console.log('\n🔑  KEY COMPROMISE LESSON:');
  console.log('    Both the legitimate v1.0.0 and the attacker\'s v1.0.1 show ✅ VALID here.');
  console.log('    The attacker signed their malicious package with the STOLEN private key.');
  console.log('    Signature verification cannot distinguish a legitimate release from an');
  console.log('    attacker-signed release when the key itself is compromised.');
  console.log('    Defence: transparency logs (Sigstore), SBOM hash pinning, behavioural analysis.');
}

console.log(sep);
