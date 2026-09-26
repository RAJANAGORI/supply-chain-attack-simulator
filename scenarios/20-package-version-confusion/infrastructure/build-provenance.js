#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Generates an Ed25519 keypair and signs npm provenance and GitHub artifact
 * attestation statements for the malicious trusted-logger package.
 *
 * In the attack narrative:
 *   - The private key lives in the CI/CD secret store.
 *   - An attacker compromises the publish workflow and steals the key.
 *   - They build a malicious package, sign provenance/attestation with the
 *     same key, and publish it.
 *   - Consumers who verify signatures see VALID for both identity and
 *     integrity, but the package still contains malicious behavior.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const scenarioDir = path.join(__dirname, '..');
const pkgDir = path.join(scenarioDir, 'malicious-package', 'trusted-logger');
const infraKeysDir = path.join(scenarioDir, 'infrastructure', 'keys');
const victimKeysDir = path.join(scenarioDir, 'victim-app', 'keys');
const templatePath = path.join(scenarioDir, 'templates', 'malicious-package-template.js');

fs.mkdirSync(pkgDir, { recursive: true });
fs.mkdirSync(infraKeysDir, { recursive: true });
fs.mkdirSync(victimKeysDir, { recursive: true });

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

fs.writeFileSync(path.join(infraKeysDir, 'provenance-private.pem'), privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(victimKeysDir, 'provenance-public.pem'), publicKey);

fs.copyFileSync(templatePath, path.join(pkgDir, 'index.js'));

fs.writeFileSync(
  path.join(pkgDir, 'package.json'),
  JSON.stringify(
    {
      name: 'trusted-logger',
      version: '9.9.9',
      description: 'Structured logging helper (educational simulation — compromised CI provenance)',
      main: 'index.js',
      license: 'MIT',
    },
    null,
    2
  )
);

function sha512(filePath) {
  return crypto.createHash('sha512').update(fs.readFileSync(filePath)).digest('hex');
}

function signStatement(statement) {
  const payload = Buffer.from(JSON.stringify(statement));
  const sig = crypto.sign(null, payload, privateKey);
  return {
    sig: sig.toString('base64'),
    keyId: 'scas-lab-provenance-key-001',
    algorithm: 'Ed25519',
  };
}

const indexDigest = sha512(path.join(pkgDir, 'index.js'));
const startedOn = new Date().toISOString();

const provenanceStatement = {
  _type: 'https://in-toto.io/Statement/v1',
  subject: [
    {
      name: 'pkg:npm/trusted-logger@9.9.9',
      digest: { sha512: indexDigest },
    },
  ],
  predicateType: 'https://slsa.dev/provenance/v1',
  predicate: {
    buildDefinition: {
      buildType: 'https://github.com/actions/runner-github/v1',
      externalParameters: {
        workflow: {
          repository: 'https://github.com/octo-org/trusted-logger',
          ref: 'refs/heads/main',
          path: '.github/workflows/publish.yml',
        },
      },
    },
    runDetails: {
      builder: {
        id: 'https://github.com/octo-org/trusted-logger/.github/workflows/publish.yml@refs/heads/main',
      },
      metadata: {
        invocationId: 'https://github.com/octo-org/trusted-logger/actions/runs/123456789',
        startedOn,
      },
    },
  },
};

const provenanceSignature = signStatement(provenanceStatement);
fs.writeFileSync(
  path.join(pkgDir, 'provenance.json'),
  JSON.stringify({ ...provenanceStatement, signature: provenanceSignature }, null, 2)
);

const attestationStatement = {
  _type: 'https://in-toto.io/Statement/v1',
  subject: [
    {
      name: 'trusted-logger-9.9.9.tgz',
      digest: { sha512: indexDigest },
    },
  ],
  predicateType: 'https://github.com/attestation/v1',
  predicate: {
    issuer: 'https://token.actions.githubusercontent.com',
    workflow: {
      repository: 'https://github.com/octo-org/trusted-logger',
      ref: 'refs/heads/main',
      path: '.github/workflows/publish.yml',
    },
  },
};

const attestationSignature = signStatement(attestationStatement);
fs.writeFileSync(
  path.join(pkgDir, 'attestation.sigstore.json'),
  JSON.stringify({ ...attestationStatement, signature: attestationSignature }, null, 2)
);

const pubDer = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
const fingerprint = crypto
  .createHash('sha256')
  .update(pubDer)
  .digest('hex')
  .toUpperCase()
  .match(/.{2}/g)
  .join(':');

fs.writeFileSync(
  path.join(infraKeysDir, 'key-info.json'),
  JSON.stringify(
    {
      keyId: 'scas-lab-provenance-key-001',
      algorithm: 'Ed25519',
      fingerprint,
      owner: 'octo-org CI/CD <security@octo-org.example>',
      createdAt: startedOn,
      compromisedAt: null,
      note: 'Lab key — stolen from CI/CD secrets in the attack scenario.',
    },
    null,
    2
  )
);

console.log('[build-provenance] Ed25519 keypair and public key written.');
console.log('[build-provenance] Malicious package signed with valid npm provenance + GitHub attestation.');
console.log(`[build-provenance] Index artifact digest (sha512): ${indexDigest.slice(0, 32)}...`);
