/**
 * Victim application for Scenario 20.
 * Verifies the malicious package's npm provenance and GitHub artifact
 * attestation before loading it. Both signatures are valid because the
 * attacker compromised the CI signing key.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const appDir = __dirname;
const pkgDir = path.join(appDir, 'node_modules', 'trusted-logger');
const pubKeyPath = path.join(appDir, 'keys', 'provenance-public.pem');

function sha512(filePath) {
  return crypto.createHash('sha512').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyBundle(bundlePath, publicKeyPem) {
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

  return { valid, digestMatch, bundle };
}

console.log('Starting victim app (Scenario 20: npm Provenance / Attestation Abuse)...');

if (!fs.existsSync(pkgDir)) {
  console.error('❌ trusted-logger is not installed. Run: npm install');
  process.exit(1);
}

if (!fs.existsSync(pubKeyPath)) {
  console.error('❌ Public key not found. Run ./setup.sh first.');
  process.exit(1);
}

const publicKey = fs.readFileSync(pubKeyPath);
const provenance = verifyBundle(path.join(pkgDir, 'provenance.json'), publicKey);
const attestation = verifyBundle(path.join(pkgDir, 'attestation.sigstore.json'), publicKey);

console.log('Provenance signature valid:', provenance.valid ? '✅ YES' : '❌ NO');
console.log('Attestation signature valid:', attestation.valid ? '✅ YES' : '❌ NO');
console.log('Artifact digest match:', provenance.digestMatch && attestation.digestMatch ? '✅ YES' : '❌ NO');

if (!provenance.valid || !attestation.valid || !provenance.digestMatch || !attestation.digestMatch) {
  console.error('❌ Verification failed — refusing to load trusted-logger.');
  process.exit(1);
}

console.log('✅ All provenance and attestation checks passed — loading package.');

const logger = require('trusted-logger');
logger.log('info', 'Victim application started successfully');
