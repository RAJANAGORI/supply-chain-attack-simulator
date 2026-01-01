#!/usr/bin/env node

/**
 * Signature Validator
 * Validates package signatures and detects signing bypass attacks
 */

const fs = require('fs');
const path = require('path');

class SignatureValidator {
  constructor(packagePath) {
    this.packagePath = packagePath;
    this.findings = [];
    this.packageJson = null;
  }

  /**
   * Validate package signature
   */
  async validate() {
    console.log('🔍 Signature Validator');
    console.log('='.repeat(60));
    console.log(`Validating: ${this.packagePath}\n`);

    try {
      await this.loadPackageJson();
      await this.checkSignatureExists();
      await this.validateSignature();
      await this.checkKeyFingerprint();
      await this.analyzeBehavior();
      this.generateReport();
      
      return this.findings.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  /**
   * Load package.json
   */
  async loadPackageJson() {
    const packageJsonPath = path.join(this.packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }
    this.packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  }

  /**
   * Check if signature information exists
   */
  async checkSignatureExists() {
    if (!this.packageJson.signing) {
      this.findings.push({
        severity: 'WARNING',
        type: 'NO_SIGNATURE',
        message: 'Package has no signature information',
        recommendation: 'Package should be signed for security'
      });
      return;
    }
    console.log('✅ Signature information found');
    console.log('');
  }

  /**
   * Validate signature
   */
  async validateSignature() {
    if (!this.packageJson.signing) return;

    const signing = this.packageJson.signing;
    
    console.log('🔍 Validating signature...\n');
    console.log(`Key ID: ${signing.keyId}`);
    console.log(`Key Fingerprint: ${signing.keyFingerprint}`);
    console.log(`Signed By: ${signing.signedBy}`);
    console.log(`Signature Date: ${signing.signatureDate}`);
    console.log('');

    // In real scenario, would verify actual signature
    // For educational purposes, we check if signature info exists
    if (signing.keyId && signing.keyFingerprint) {
      console.log('✅ Signature information present');
    } else {
      this.findings.push({
        severity: 'ERROR',
        type: 'INVALID_SIGNATURE',
        message: 'Signature information is incomplete',
        recommendation: 'Package signature is invalid'
      });
    }
    console.log('');
  }

  /**
   * Check key fingerprint
   */
  async checkKeyFingerprint() {
    if (!this.packageJson.signing) return;

    console.log('🔍 Checking key fingerprint...\n');

    const expectedFingerprint = 'ABCD 1234 EFGH 5678 90AB CDEF 1234 5678 90AB CDEF';
    const actualFingerprint = this.packageJson.signing.keyFingerprint;

    if (actualFingerprint === expectedFingerprint) {
      console.log('✅ Key fingerprint matches expected value');
      console.log(`   ${actualFingerprint}`);
    } else {
      this.findings.push({
        severity: 'CRITICAL',
        type: 'FINGERPRINT_MISMATCH',
        message: `Key fingerprint mismatch: ${actualFingerprint}`,
        recommendation: 'This may indicate key compromise or package tampering'
      });
    }
    console.log('');
  }

  /**
   * Analyze package behavior
   */
  async analyzeBehavior() {
    console.log('🔍 Analyzing package behavior...\n');

    // Check for postinstall scripts (suspicious in signed packages)
    if (this.packageJson.scripts && this.packageJson.scripts.postinstall) {
      this.findings.push({
        severity: 'WARNING',
        type: 'POSTINSTALL_IN_SIGNED',
        message: 'Package has postinstall script despite being signed',
        recommendation: 'Review postinstall script - signed packages should be trusted, but scripts can still be malicious'
      });
    }

    // Check package path for suspicious files
    const postinstallPath = path.join(this.packagePath, 'postinstall.js');
    if (fs.existsSync(postinstallPath)) {
      const content = fs.readFileSync(postinstallPath, 'utf8');
      if (content.includes('exfiltrate') || content.includes('collect') || content.includes('/collect')) {
        this.findings.push({
          severity: 'CRITICAL',
          type: 'MALICIOUS_BEHAVIOR',
          message: 'Package contains postinstall script with data exfiltration',
          recommendation: 'CRITICAL: Package appears malicious despite valid signature - keys may be compromised!'
        });
      }
    }

    console.log('✅ Behavior analysis completed');
    console.log('');
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Validation Results');
    console.log('='.repeat(60));

    const critical = this.findings.filter(f => f.severity === 'CRITICAL').length;
    const warnings = this.findings.filter(f => f.severity === 'WARNING').length;
    const errors = this.findings.filter(f => f.severity === 'ERROR').length;

    console.log(`Total Findings: ${this.findings.length}`);
    console.log(`  🚨 Critical: ${critical}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ Signature validation passed!');
      console.log('⚠️  However, remember: Valid signatures do not guarantee package safety');
      console.log('   if signing keys are compromised!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    this.findings.forEach(finding => {
      const icon = finding.severity === 'CRITICAL' ? '🚨' :
                   finding.severity === 'ERROR' ? '❌' :
                   finding.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (finding.recommendation) {
        console.log(`   Recommendation: ${finding.recommendation}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANT: Signature verification alone is not sufficient!');
    console.log('   If signing keys are compromised, signatures will verify as valid');
    console.log('   but packages can still be malicious.');
    console.log('   Always combine signature verification with behavioral analysis.');
    
    if (critical > 0 || errors > 0) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const packagePath = process.argv[2] || process.cwd();
  const validator = new SignatureValidator(packagePath);
  validator.validate();
}

module.exports = SignatureValidator;

