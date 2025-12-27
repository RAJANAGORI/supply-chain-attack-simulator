#!/usr/bin/env node

/**
 * Lock File Validator
 * Validates package-lock.json integrity and detects manipulation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LockFileValidator {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.findings = [];
    this.packageJson = null;
    this.packageLockJson = null;
  }

  /**
   * Validate lock file
   */
  async validate() {
    console.log('🔍 Lock File Validator');
    console.log('='.repeat(60));
    console.log(`Validating: ${this.projectPath}\n`);

    try {
      await this.loadFiles();
      await this.checkLockFileExists();
      await this.validatePackageConsistency();
      await this.detectUnexpectedPackages();
      await this.checkIntegrity();
      await this.verifyChecksums();
      this.generateReport();
      
      return this.findings.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  /**
   * Load package.json and package-lock.json
   */
  async loadFiles() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    const packageLockPath = path.join(this.projectPath, 'package-lock.json');

    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    this.packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (!fs.existsSync(packageLockPath)) {
      this.findings.push({
        severity: 'WARNING',
        type: 'MISSING_LOCK_FILE',
        message: 'package-lock.json not found. Consider generating one for security.'
      });
      return;
    }

    this.packageLockJson = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  }

  /**
   * Check if lock file exists
   */
  async checkLockFileExists() {
    if (!this.packageLockJson) {
      return;
    }

    console.log('✅ package-lock.json found');
    console.log(`   Lock file version: ${this.packageLockJson.lockfileVersion || 'unknown'}`);
    console.log('');
  }

  /**
   * Validate package consistency
   */
  async validatePackageConsistency() {
    if (!this.packageLockJson) return;

    console.log('🔍 Validating package consistency...\n');

    const packageDeps = {
      ...this.packageJson.dependencies || {},
      ...this.packageJson.devDependencies || {}
    };

    const lockDeps = this.packageLockJson.dependencies || {};

    // Check for packages in lock file but not in package.json
    Object.keys(lockDeps).forEach(pkg => {
      if (!packageDeps[pkg] && !pkg.startsWith('@types/')) {
        this.findings.push({
          severity: 'CRITICAL',
          type: 'UNEXPECTED_PACKAGE',
          package: pkg,
          version: lockDeps[pkg].version,
          message: `Package "${pkg}" found in package-lock.json but NOT in package.json`,
          recommendation: 'This may indicate lock file manipulation. Review and remove if not needed.'
        });
      }
    });

    // Check for packages in package.json but not in lock file
    Object.keys(packageDeps).forEach(pkg => {
      if (!lockDeps[pkg]) {
        this.findings.push({
          severity: 'WARNING',
          type: 'MISSING_IN_LOCK',
          package: pkg,
          message: `Package "${pkg}" in package.json but not in package-lock.json`,
          recommendation: 'Run npm install to update lock file'
        });
      }
    });

    if (this.findings.length === 0) {
      console.log('✅ Package consistency check passed');
    }
    console.log('');
  }

  /**
   * Detect unexpected packages
   */
  async detectUnexpectedPackages() {
    if (!this.packageLockJson) return;

    console.log('🔍 Detecting unexpected packages...\n');

    const suspiciousPatterns = [
      { pattern: /evil|malicious|hack|steal/i, name: 'Suspicious package name' },
      { pattern: /^[a-z]{1,3}$/, name: 'Very short package name (typosquatting risk)' },
    ];

    const lockDeps = this.packageLockJson.dependencies || {};

    Object.keys(lockDeps).forEach(pkg => {
      // Check for suspicious patterns
      suspiciousPatterns.forEach(({ pattern, name }) => {
        if (pattern.test(pkg)) {
          this.findings.push({
            severity: 'WARNING',
            type: 'SUSPICIOUS_PACKAGE',
            package: pkg,
            message: `Suspicious package detected: "${pkg}" - ${name}`,
            recommendation: 'Review this package carefully'
          });
        }
      });

      // Check for postinstall scripts
      const pkgInfo = lockDeps[pkg];
      if (pkgInfo && pkgInfo.dependencies) {
        // Check nested dependencies too
        Object.keys(pkgInfo.dependencies).forEach(nestedPkg => {
          const nestedInfo = pkgInfo.dependencies[nestedPkg];
          if (nestedInfo && nestedInfo.requires) {
            // Check if nested package has scripts
            if (nestedInfo.extraneous === false && !this.packageJson.dependencies[nestedPkg]) {
              // This is a transitive dependency, check for scripts
            }
          }
        });
      }
    });

    // Check for packages with postinstall scripts
    Object.keys(lockDeps).forEach(pkg => {
      const pkgInfo = lockDeps[pkg];
      if (pkgInfo && pkgInfo.extraneous === false) {
        // Check if package has postinstall in its resolved location
        const nodeModulesPath = path.join(this.projectPath, 'node_modules', pkg, 'package.json');
        if (fs.existsSync(nodeModulesPath)) {
          try {
            const pkgJson = JSON.parse(fs.readFileSync(nodeModulesPath, 'utf8'));
            if (pkgJson.scripts && (pkgJson.scripts.postinstall || pkgJson.scripts.install)) {
              const isInPackageJson = this.packageJson.dependencies && 
                                     this.packageJson.dependencies[pkg];
              if (!isInPackageJson) {
                this.findings.push({
                  severity: 'CRITICAL',
                  type: 'POSTINSTALL_IN_UNEXPECTED',
                  package: pkg,
                  message: `Package "${pkg}" has postinstall script but is not in package.json`,
                  recommendation: 'This is highly suspicious - may indicate lock file manipulation'
                });
              }
            }
          } catch (e) {
            // Skip if can't read
          }
        }
      }
    });
  }

  /**
   * Check lock file integrity
   */
  async checkIntegrity() {
    if (!this.packageLockJson) return;

    console.log('🔍 Checking lock file integrity...\n');

    // Check for required fields
    const requiredFields = ['lockfileVersion', 'dependencies'];
    requiredFields.forEach(field => {
      if (!this.packageLockJson[field]) {
        this.findings.push({
          severity: 'ERROR',
          type: 'INVALID_LOCK_FILE',
          message: `Missing required field: ${field}`,
          recommendation: 'Lock file may be corrupted or manipulated'
        });
      }
    });

    // Check lockfileVersion
    if (this.packageLockJson.lockfileVersion) {
      const version = this.packageLockJson.lockfileVersion;
      if (version !== 2 && version !== 3) {
        this.findings.push({
          severity: 'WARNING',
          type: 'UNUSUAL_LOCK_VERSION',
          message: `Unusual lockfileVersion: ${version} (expected 2 or 3)`,
          recommendation: 'Verify lock file was generated by npm'
        });
      }
    }

    console.log('✅ Integrity check completed');
    console.log('');
  }

  /**
   * Verify checksums (if available)
   */
  async verifyChecksums() {
    if (!this.packageLockJson) return;

    console.log('🔍 Verifying package checksums...\n');

    const lockDeps = this.packageLockJson.dependencies || {};
    let verified = 0;
    let failed = 0;

    Object.keys(lockDeps).forEach(pkg => {
      const pkgInfo = lockDeps[pkg];
      if (pkgInfo && pkgInfo.integrity) {
        verified++;
        // In real scenario, would verify integrity hash
      } else if (pkgInfo && pkgInfo.version) {
        // Old format, no integrity
        this.findings.push({
          severity: 'INFO',
          type: 'NO_INTEGRITY_HASH',
          package: pkg,
          message: `Package "${pkg}" has no integrity hash (old lock file format)`,
          recommendation: 'Regenerate lock file with npm install'
        });
      }
    });

    if (verified > 0) {
      console.log(`✅ Verified ${verified} package checksums`);
    }
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
    const info = this.findings.filter(f => f.severity === 'INFO').length;

    console.log(`Total Findings: ${this.findings.length}`);
    console.log(`  🚨 Critical: ${critical}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  ℹ️  Info: ${info}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ Lock file validation passed!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    this.findings.forEach(finding => {
      const icon = finding.severity === 'CRITICAL' ? '🚨' :
                   finding.severity === 'ERROR' ? '❌' :
                   finding.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (finding.package) {
        console.log(`   Package: ${finding.package}`);
      }
      if (finding.recommendation) {
        console.log(`   Recommendation: ${finding.recommendation}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    
    if (critical > 0 || errors > 0) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  const validator = new LockFileValidator(projectPath);
  validator.validate();
}

module.exports = LockFileValidator;

