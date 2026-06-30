#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Generates a real Ed25519 keypair for the Scenario 09 signing-bypass lab.
 * Uses only Node.js built-in `crypto` — no external dependencies.
 *
 * In the attack narrative:
 *   - The private key is the "Secure Tools Inc." code-signing key.
 *   - The attacker steals it from a compromised CI/CD secret store.
 *   - They use the same key to sign a malicious v1.0.1 package.
 *   - Both the legitimate v1.0.0 and the malicious v1.0.1 have a VALID signature.
 *
 * Output: infrastructure/keys/{private.pem, public.pem, key-info.json}
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, 'keys');
fs.mkdirSync(keysDir, { recursive: true });

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
});

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(keysDir, 'public.pem'),  publicKey);

// Human-readable fingerprint: SHA-256 of the DER-encoded public key
const pubDer = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
const fingerprint = crypto
  .createHash('sha256')
  .update(pubDer)
  .digest('hex')
  .toUpperCase()
  .match(/.{2}/g)
  .join(':');

const keyInfo = {
  keyId: 'scas-lab-key-001',
  algorithm: 'Ed25519',
  fingerprint,
  owner: 'Secure Tools Inc. <security@securetools.com>',
  createdAt: new Date().toISOString(),
  compromisedAt: null,
  note: 'Lab key — stolen from CI/CD secrets in the attack scenario.',
};

fs.writeFileSync(path.join(keysDir, 'key-info.json'), JSON.stringify(keyInfo, null, 2));

console.log('[keygen] Ed25519 keypair written to infrastructure/keys/');
console.log(`[keygen] Key ID:          ${keyInfo.keyId}`);
console.log(`[keygen] Fingerprint:     ${fingerprint.slice(0, 32)}...`);
console.log('[keygen] private.pem → used to sign BOTH the legitimate and malicious packages.');
console.log('[keygen] public.pem  → distributed alongside packages for consumers to verify.');
