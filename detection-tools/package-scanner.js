#!/usr/bin/env node

/**
 * Package Security Scanner
 * Scans Node.js projects for potential supply chain vulnerabilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PackageScanner {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.findings = [];
    this.stats = {
      totalPackages: 0,
      suspiciousPackages: 0,
      criticalFindings: 0,
      warningFindings: 0,
      infoFindings: 0
    };
  }

  /**
   * Run all scans
   */
  async scan() {
    console.log('🔍 Package Security Scanner');
    console.log('='.repeat(60));
    console.log(`Scanning: ${this.projectPath}\n`);

    try {
      await this.scanPackageJson();
      await this.scanNodeModules();
      await this.checkForTyposquatting();
      await this.checkForDependencyConfusion();
      await this.scanForMaliciousPatterns();
      
      this.generateReport();
      
      return this.findings.length > 0;
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      return false;
    }
  }

  /**
   * Scan package.json for suspicious patterns
   */
  async scanPackageJson() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.addFinding('ERROR', 'No package.json found', 'FILE_NOT_FOUND');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.optionalDependencies
    };

    this.stats.totalPackages = Object.keys(allDeps).length;

    // Check for suspicious scripts
    if (packageJson.scripts) {
      for (const [name, script] of Object.entries(packageJson.scripts)) {
        if (script.includes('curl') || script.includes('wget')) {
          this.addFinding(
            'WARNING',
            `Script "${name}" contains network operations: ${script}`,
            'SUSPICIOUS_SCRIPT'
          );
        }
        
        if (script.includes('rm -rf') || script.includes('del /f')) {
          this.addFinding(
            'WARNING',
            `Script "${name}" contains destructive operations: ${script}`,
            'DESTRUCTIVE_SCRIPT'
          );
        }
      }
    }

    console.log(`✅ Scanned package.json (${this.stats.totalPackages} dependencies)`);
  }

  /**
   * Scan node_modules for suspicious packages
   */
  async scanNodeModules() {
    const nodeModulesPath = path.join(this.projectPath, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('ℹ️  node_modules not found, skipping scan');
      return;
    }

    const packages = fs.readdirSync(nodeModulesPath);
    let scanned = 0;

    for (const pkg of packages) {
      if (pkg.startsWith('.') || pkg.startsWith('@')) continue;
      
      const pkgPath = path.join(nodeModulesPath, pkg);
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      
      if (!fs.existsSync(pkgJsonPath)) continue;
      
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        
        // Check for suspicious version numbers
        if (pkgJson.version) {
          const [major] = pkgJson.version.split('.');
          if (parseInt(major) > 100) {
            this.addFinding(
              'CRITICAL',
              `Package "${pkg}" has suspicious version: ${pkgJson.version}`,
              'SUSPICIOUS_VERSION',
              { package: pkg, version: pkgJson.version }
            );
          }
        }

        // Check for install scripts
        if (pkgJson.scripts && (pkgJson.scripts.install || pkgJson.scripts.postinstall)) {
          this.addFinding(
            'INFO',
            `Package "${pkg}" has install scripts`,
            'INSTALL_SCRIPT',
            { package: pkg, scripts: pkgJson.scripts }
          );
        }

        scanned++;
      } catch (e) {
        // Skip malformed packages
      }
    }

    console.log(`✅ Scanned ${scanned} packages in node_modules`);
  }

  /**
   * Check for potential typosquatting
   */
  async checkForTyposquatting() {
    const popularPackages = [
      'express', 'react', 'vue', 'angular', 'lodash', 'axios',
      'moment', 'jquery', 'webpack', 'babel', 'typescript'
    ];

    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    });

    for (const dep of allDeps) {
      for (const popular of popularPackages) {
        const distance = this.levenshteinDistance(dep, popular);
        if (distance > 0 && distance <= 2 && dep !== popular) {
          this.addFinding(
            'WARNING',
            `Possible typosquatting: "${dep}" is similar to popular package "${popular}"`,
            'TYPOSQUATTING',
            { package: dep, similar: popular, distance }
          );
        }
      }
    }

    console.log('✅ Checked for typosquatting patterns');
  }

  /**
   * Check for dependency confusion vulnerabilities
   */
  async checkForDependencyConfusion() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Check for scoped packages (potential private packages)
    const scopedPackages = Object.keys(allDeps).filter(name => name.startsWith('@'));
    
    for (const pkg of scopedPackages) {
      const nodeModulesPath = path.join(this.projectPath, 'node_modules', pkg, 'package.json');
      
      if (fs.existsSync(nodeModulesPath)) {
        const installedPkg = JSON.parse(fs.readFileSync(nodeModulesPath, 'utf8'));
        
        // Check for unusually high versions (dependency confusion indicator)
        const [major] = installedPkg.version.split('.');
        if (parseInt(major) > 100) {
          this.addFinding(
            'CRITICAL',
            `Scoped package "${pkg}" may be victim of dependency confusion (version: ${installedPkg.version})`,
            'DEPENDENCY_CONFUSION',
            { package: pkg, version: installedPkg.version }
          );
        }
      }
    }

    // Check .npmrc configuration
    const npmrcPath = path.join(this.projectPath, '.npmrc');
    if (!fs.existsSync(npmrcPath) && scopedPackages.length > 0) {
      this.addFinding(
        'WARNING',
        'No .npmrc found but scoped packages detected. Consider configuring registry scopes.',
        'MISSING_NPMRC'
      );
    }

    console.log('✅ Checked for dependency confusion');
  }

  /**
   * Scan for malicious code patterns
   */
  async scanForMaliciousPatterns() {
    const nodeModulesPath = path.join(this.projectPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) return;

    const maliciousPatterns = [
      { pattern: /eval\s*\(/g, name: 'eval() usage', severity: 'WARNING' },
      { pattern: /Function\s*\(/g, name: 'Function constructor', severity: 'WARNING' },
      { pattern: /child_process/g, name: 'child_process access', severity: 'INFO' },
      { pattern: /\bexec\b/g, name: 'exec() usage', severity: 'WARNING' },
      { pattern: /base64/gi, name: 'Base64 encoding', severity: 'INFO' },
    ];

    let scannedFiles = 0;
    const packages = fs.readdirSync(nodeModulesPath);

    for (const pkg of packages.slice(0, 20)) { // Limit to first 20 for performance
      if (pkg.startsWith('.')) continue;
      
      const pkgPath = path.join(nodeModulesPath, pkg);
      const indexPath = path.join(pkgPath, 'index.js');
      
      if (!fs.existsSync(indexPath)) continue;
      
      try {
        const content = fs.readFileSync(indexPath, 'utf8');
        
        for (const { pattern, name, severity } of maliciousPatterns) {
          const matches = content.match(pattern);
          if (matches && matches.length > 3) {
            this.addFinding(
              severity,
              `Package "${pkg}" contains multiple instances of ${name} (${matches.length} times)`,
              'MALICIOUS_PATTERN',
              { package: pkg, pattern: name, count: matches.length }
            );
          }
        }
        
        scannedFiles++;
      } catch (e) {
        // Skip files that can't be read
      }
    }

    console.log(`✅ Scanned ${scannedFiles} package files for malicious patterns`);
  }

  /**
   * Add a finding
   */
  addFinding(severity, message, type, details = {}) {
    this.findings.push({ severity, message, type, details, timestamp: new Date().toISOString() });
    this.stats.suspiciousPackages++;
    
    if (severity === 'CRITICAL') this.stats.criticalFindings++;
    else if (severity === 'WARNING') this.stats.warningFindings++;
    else this.stats.infoFindings++;
  }

  /**
   * Generate scan report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Scan Results');
    console.log('='.repeat(60));
    console.log(`Total Packages: ${this.stats.totalPackages}`);
    console.log(`Suspicious Packages: ${this.stats.suspiciousPackages}`);
    console.log(`Critical Findings: ${this.stats.criticalFindings}`);
    console.log(`Warning Findings: ${this.stats.warningFindings}`);
    console.log(`Info Findings: ${this.stats.infoFindings}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ No security issues found!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    for (const finding of this.findings) {
      const icon = finding.severity === 'CRITICAL' ? '🚨' :
                   finding.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (Object.keys(finding.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(finding.details)}`);
      }
      console.log('');
    }

    console.log('='.repeat(60));
    
    if (this.stats.criticalFindings > 0) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    } else if (this.stats.warningFindings > 0) {
      console.log('\n⚠️  Warnings found. Review recommended.');
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// CLI Interface
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  const scanner = new PackageScanner(projectPath);
  scanner.scan();
}

module.exports = PackageScanner;

