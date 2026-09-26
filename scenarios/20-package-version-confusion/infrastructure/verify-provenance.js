#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Verifies the Ed25519 signatures on the malicious package's npm provenance
 * and GitHub artifact attestation.
 *
 * DEMONSTRATES THE ATTACK:
 *   Run against malicious-package/trusted-logger and observe that BOTH the
 *   provenance and attestation signatures verify as VALID. The attacker
 *   compromised the CI signing key, so signature validity alone does not
 *   guarantee safety.
 *
 * Usage:
 *   node infrastructure/verify-provenance.js <pkg-dir>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pkgDir = process.argv[2] || path.join(__dirname, '..', 'malicious-package', 'trusted-logger');
const pubKeyPath = path.join(__dirname, '..', 'victim-app', 'keys', 'provenance-public.pem');

function sha512(filePath) {
  return crypto.createHash('sha512').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyBundle(bundlePath, publicKeyPem) {
  if (!fs.existsSync(bundlePath)) {
    return { valid: false, present: false, error: 'bundle not found' };
  }

  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const statement = { ...bundle };
  delete statement.signature;

  const payload = Buffer.from(JSON.stringify(statement));
  const signature = Buffer.from(bundle.signature.sig, 'base64');
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const valid = crypto.verify(null, payload, publicKey, signature);

  const subject = bundle.subject && bundle.subject[0];
  const indexDigest = sha512(path.join(pkgDir, 'index.js'));
  const digestMatch = subject && subject.digest && subject.digest.sha512 === indexDigest;

  return { valid, present: true, digestMatch, bundle };
}

if (!fs.existsSync(pubKeyPath)) {
  console.error('Public key not found. Run ./setup.sh first.');
  process.exit(1);
}

if (!fs.existsSync(pkgDir)) {
  console.error(`Package directory not found: ${pkgDir}`);
  process.exit(1);
}

const publicKey = fs.readFileSync(pubKeyPath);
const provenance = verifyBundle(path.join(pkgDir, 'provenance.json'), publicKey);
const attestation = verifyBundle(path.join(pkgDir, 'attestation.sigstore.json'), publicKey);

const sep = '='.repeat(60);
console.log(`\n${sep}`);
console.log(`Package directory: ${pkgDir}`);
console.log(sep);

console.log('\n--- npm provenance ---');
console.log(`Present:        ${provenance.present ? 'YES' : 'NO'}`);
console.log(`Signature:      ${provenance.valid ? '✅ VALID' : '❌ INVALID'}`);
console.log(`Digest match:   ${provenance.digestMatch ? '✅ YES' : '⚠️  NO'}`);
if (provenance.bundle && provenance.bundle.predicate) {
  console.log(`Builder:        ${provenance.bundle.predicate.runDetails.builder.id}`);
}

console.log('\n--- GitHub artifact attestation ---');
console.log(`Present:        ${attestation.present ? 'YES' : 'NO'}`);
console.log(`Signature:      ${attestation.valid ? '✅ VALID' : '❌ INVALID'}`);
console.log(`Digest match:   ${attestation.digestMatch ? '✅ YES' : '⚠️  NO'}`);
if (attestation.bundle && attestation.bundle.predicate) {
  console.log(`Issuer:         ${attestation.bundle.predicate.issuer}`);
  console.log(`Workflow repo:  ${attestation.bundle.predicate.workflow.repository}`);
  console.log(`Workflow ref:   ${attestation.bundle.predicate.workflow.ref}`);
  console.log(`Workflow path:  ${attestation.bundle.predicate.workflow.path}`);
}

console.log(`\n${sep}`);
if (provenance.valid && attestation.valid) {
  console.log('KEY COMPROMISE LESSON:');
  console.log('  Both signatures are VALID because the attacker controls the signing key.');
  console.log('  Provenance and attestation prove origin and integrity, not safety.');
  console.log('  Defence: pin builder identity, monitor workflows, and scan package behavior.');
}
console.log(`${sep}\n`);
