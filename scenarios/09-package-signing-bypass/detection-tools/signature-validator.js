#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Signature Validator — Scenario 09 (Package Signing Bypass)
 *
 * Performs REAL Ed25519 signature verification using Node.js built-in crypto.
 * Demonstrates that cryptographic validity is insufficient when the key is
 * compromised: the malicious package also passes signature verification.
 *
 * Usage:
 *   node detection-tools/signature-validator.js <pkg-dir>
 *
 * Typical targets:
 *   node detection-tools/signature-validator.js legitimate-package/secure-utils
 *   node detection-tools/signature-validator.js compromised-package/secure-utils
 *   node detection-tools/signature-validator.js victim-app/node_modules/secure-utils
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────────

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

function loadPublicKey() {
  // Public key lives next to the scenario's infrastructure/ dir
  const scenarioDir = path.join(__dirname, '..');
  const pubKeyPath  = path.join(scenarioDir, 'infrastructure', 'keys', 'public.pem');
  if (!fs.existsSync(pubKeyPath)) return null;
  return fs.readFileSync(pubKeyPath);
}

// ── validator ─────────────────────────────────────────────────────────────────

class SignatureValidator {
  constructor(pkgPath) {
    this.pkgPath  = pkgPath;
    this.findings = [];
    this.pkgJson  = null;
    this.sigData  = null;
    this.publicKey = loadPublicKey();
  }

  async validate() {
    const sep = '='.repeat(60);
    console.log('\n🔍 Signature Validator (real Ed25519 crypto)');
    console.log(sep);
    console.log(`Target: ${this.pkgPath}\n`);

    try {
      this._loadPackageJson();
      this._checkSignatureFile();
      this._verifyCrypto();
      this._analyzePostinstall();
      this._generateReport();
      return this.findings.filter(f => f.severity === 'CRITICAL').length === 0;
    } catch (err) {
      console.error('❌  Validation error:', err.message);
      return false;
    }
  }

  _loadPackageJson() {
    const p = path.join(this.pkgPath, 'package.json');
    if (!fs.existsSync(p)) throw new Error('package.json not found');
    this.pkgJson = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`Package: ${this.pkgJson.name}@${this.pkgJson.version}`);
  }

  _checkSignatureFile() {
    const sigPath = path.join(this.pkgPath, 'package.sig');
    if (!fs.existsSync(sigPath)) {
      this.findings.push({
        severity: 'WARNING',
        type: 'NO_SIGNATURE',
        message: 'No package.sig found — package is unsigned.',
        recommendation: 'Require all packages to carry a valid signature.',
      });
      console.log('⚠️   No package.sig found.\n');
      return;
    }
    this.sigData = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
    console.log(`Algorithm:  ${this.sigData.algorithm}`);
    console.log(`Key ID:     ${this.sigData.keyId}`);
    console.log(`Signed by:  ${this.sigData.signedBy}`);
    console.log(`Signed at:  ${this.sigData.signedAt}`);
    console.log(`Label:      ${this.sigData.label || '(none)'}`);
    console.log('');
  }

  _verifyCrypto() {
    if (!this.sigData) return;

    if (!this.publicKey) {
      this.findings.push({
        severity: 'WARNING',
        type: 'NO_PUBLIC_KEY',
        message: 'infrastructure/keys/public.pem not found — run setup.sh first.',
        recommendation: 'Run ./setup.sh to generate the lab keypair.',
      });
      console.log('⚠️   Public key not available — skipping crypto verification.\n');
      return;
    }

    console.log('🔐 Running real Ed25519 verification…');

    const sigBuf = Buffer.from(this.sigData.signature, 'base64');
    const sigValid = crypto.verify(
      null,
      Buffer.from(this.sigData.contentHash, 'hex'),
      this.publicKey,
      sigBuf
    );

    const currentHash      = packageContentHash(this.pkgPath);
    const contentUnchanged = this.sigData.contentHash === currentHash;

    console.log(`   Cryptographic signature: ${sigValid ? '✅  VALID'  : '❌  INVALID'}`);
    console.log(`   Signed content hash:  ${this.sigData.contentHash.slice(0, 32)}…`);
    console.log(`   Current content hash: ${currentHash.slice(0, 32)}…`);
    console.log(`   Content unchanged:    ${contentUnchanged ? '✅  YES' : '⚠️   NO'}`);
    console.log('');

    if (!sigValid) {
      this.findings.push({
        severity: 'CRITICAL',
        type: 'INVALID_SIGNATURE',
        message: 'Ed25519 signature is cryptographically INVALID.',
        recommendation: 'Package may have been tampered with. Do not install.',
      });
    } else {
      // Signature is valid — but that's the point of the attack!
      this.findings.push({
        severity: 'INFO',
        type: 'VALID_SIGNATURE',
        message: 'Ed25519 signature is cryptographically VALID (key is trusted).',
        recommendation: 'Note: this is also true for the ATTACKER\'s package — key is compromised!',
      });
    }
  }

  _analyzePostinstall() {
    const pkgJson = this.pkgJson;
    if (!pkgJson) return;

    console.log('🔍 Behavioural analysis…');

    const hasPostinstall = pkgJson.scripts && pkgJson.scripts.postinstall;
    if (hasPostinstall) {
      this.findings.push({
        severity: 'WARNING',
        type: 'POSTINSTALL_PRESENT',
        message: 'Package declares a postinstall script.',
        recommendation: 'Audit the postinstall script before installing.',
      });
      console.log('   ⚠️   postinstall script detected in package.json');
    }

    const postPath = path.join(this.pkgPath, 'postinstall.js');
    if (fs.existsSync(postPath)) {
      const src = fs.readFileSync(postPath, 'utf8');
      if (/\/collect|exfiltrat|curl|http\.request/i.test(src)) {
        this.findings.push({
          severity: 'CRITICAL',
          type: 'MALICIOUS_POSTINSTALL',
          message: 'postinstall.js contains network exfiltration code.',
          recommendation: 'CRITICAL: Package is malicious despite a valid signature. Key is compromised!',
        });
        console.log('   🚨 postinstall.js contains network exfiltration patterns!');
      }
    }

    console.log('');
  }

  _generateReport() {
    const sep      = '='.repeat(60);
    const critical = this.findings.filter(f => f.severity === 'CRITICAL').length;
    const warnings = this.findings.filter(f => f.severity === 'WARNING').length;
    const infos    = this.findings.filter(f => f.severity === 'INFO').length;

    console.log(`\n${sep}`);
    console.log('📊 Validation Report');
    console.log(sep);
    console.log(`  🚨 Critical: ${critical}`);
    console.log(`  ⚠️   Warnings: ${warnings}`);
    console.log(`  ℹ️   Info:     ${infos}`);
    console.log(sep);

    for (const f of this.findings) {
      const icon = f.severity === 'CRITICAL' ? '🚨' :
                   f.severity === 'WARNING'  ? '⚠️ ' : 'ℹ️ ';
      console.log(`\n${icon} [${f.severity}] ${f.message}`);
      if (f.recommendation) console.log(`     → ${f.recommendation}`);
    }

    console.log(`\n${sep}`);
    console.log('⚠️   KEY LESSON: Signature verification alone is NOT sufficient.');
    console.log('    When a signing key is compromised, an attacker can sign any payload.');
    console.log('    Combine signatures with: transparency logs, SBOM hash pinning,');
    console.log('    behavioural sandboxing, and postinstall script audits.');
    console.log(sep);

    if (critical > 0) {
      console.log('\n🚨 CRITICAL issues found — package is malicious!');
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const pkgPath = process.argv[2] || process.cwd();
  const v = new SignatureValidator(pkgPath);
  v.validate();
}

module.exports = SignatureValidator;
