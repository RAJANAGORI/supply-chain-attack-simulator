#!/usr/bin/env node

/**
 * Mirror Validator
 * Validates packages from mirror against upstream registry
 */

const fs = require('fs');
const path = require('path');

class MirrorValidator {
  constructor(mirrorPath, upstreamPath) {
    this.mirrorPath = mirrorPath;
    this.upstreamPath = upstreamPath;
    this.findings = [];
  }

  async validate() {
    console.log('🔍 Mirror Validator');
    console.log('='.repeat(60));
    console.log(`Validating mirror: ${this.mirrorPath}`);
    console.log(`Against upstream: ${this.upstreamPath}\n`);

    try {
      await this.comparePackages();
      this.generateReport();
      return this.findings.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  async comparePackages() {
    const mirrorPackages = fs.readdirSync(this.mirrorPath);
    
    for (const pkg of mirrorPackages) {
      const mirrorPkgPath = path.join(this.mirrorPath, pkg);
      const upstreamPkgPath = path.join(this.upstreamPath, pkg);
      
      if (!fs.existsSync(upstreamPkgPath)) {
        this.findings.push({
          severity: 'WARNING',
          package: pkg,
          message: `Package ${pkg} exists in mirror but not in upstream`,
          recommendation: 'Verify package source'
        });
        continue;
      }

      // Compare package.json
      const mirrorPkgJson = JSON.parse(fs.readFileSync(path.join(mirrorPkgPath, 'package.json'), 'utf8'));
      const upstreamPkgJson = JSON.parse(fs.readFileSync(path.join(upstreamPkgPath, 'package.json'), 'utf8'));

      // Check for postinstall scripts (suspicious in mirrored packages)
      if (mirrorPkgJson.scripts && mirrorPkgJson.scripts.postinstall) {
        if (!upstreamPkgJson.scripts || !upstreamPkgJson.scripts.postinstall) {
          this.findings.push({
            severity: 'CRITICAL',
            package: pkg,
            message: `Package ${pkg} has postinstall script in mirror but not in upstream`,
            recommendation: 'CRITICAL: Mirror may be compromised!'
          });
        }
      }

      // Check version mismatch
      if (mirrorPkgJson.version !== upstreamPkgJson.version) {
        this.findings.push({
          severity: 'WARNING',
          package: pkg,
          message: `Version mismatch: mirror=${mirrorPkgJson.version}, upstream=${upstreamPkgJson.version}`,
          recommendation: 'Verify version is intentional'
        });
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Validation Results');
    console.log('='.repeat(60));

    const critical = this.findings.filter(f => f.severity === 'CRITICAL').length;
    const warnings = this.findings.filter(f => f.severity === 'WARNING').length;

    console.log(`Total Findings: ${this.findings.length}`);
    console.log(`  🚨 Critical: ${critical}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ Mirror validation passed!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    this.findings.forEach(finding => {
      const icon = finding.severity === 'CRITICAL' ? '🚨' : '⚠️';
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (finding.recommendation) {
        console.log(`   Recommendation: ${finding.recommendation}`);
      }
      console.log('');
    });

    if (critical > 0) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const mirrorPath = process.argv[2] || path.join(__dirname, '../compromised-mirror');
  const upstreamPath = process.argv[3] || path.join(__dirname, '../legitimate-packages');
  const validator = new MirrorValidator(mirrorPath, upstreamPath);
  validator.validate();
}

module.exports = MirrorValidator;
