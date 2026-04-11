#!/usr/bin/env node

/**
 * Workspace Scanner
 * Scans workspace packages to identify compromised packages
 * and detect potential workspace attacks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WorkspaceScanner {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.findings = [];
    this.workspacePackages = {};
  }

  /**
   * Scan the workspace
   */
  async scan() {
    console.log('🔍 Workspace Scanner');
    console.log('='.repeat(60));
    console.log(`Scanning workspace: ${this.workspaceRoot}\n`);

    try {
      await this.loadWorkspaceConfig();
      await this.scanWorkspacePackages();
      await this.checkForSuspiciousPackages();
      this.generateReport();
      
      return this.findings.length > 0;
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      return false;
    }
  }

  /**
   * Load workspace configuration
   */
  async loadWorkspaceConfig() {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.workspaces) {
      console.log('ℹ️  No workspaces configured');
      return;
    }

    console.log('📦 Workspace Configuration:');
    console.log(`  Workspaces: ${packageJson.workspaces.join(', ')}\n`);

    // Find all workspace packages
    const packagesDir = path.join(this.workspaceRoot, 'packages');
    if (fs.existsSync(packagesDir)) {
      const packages = fs.readdirSync(packagesDir);
      packages.forEach(pkg => {
        const pkgPath = path.join(packagesDir, pkg);
        if (fs.statSync(pkgPath).isDirectory()) {
          this.workspacePackages[pkg] = pkgPath;
        }
      });
    }
  }

  /**
   * Scan workspace packages
   */
  async scanWorkspacePackages() {
    console.log('📦 Workspace Packages:\n');
    
    Object.keys(this.workspacePackages).forEach(pkgName => {
      const pkgPath = this.workspacePackages[pkgName];
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      
      if (!fs.existsSync(pkgJsonPath)) {
        return;
      }

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        console.log(`  📦 ${pkgJson.name}@${pkgJson.version}`);
        console.log(`     Path: ${pkgPath}`);
        
        if (pkgJson.dependencies) {
          const workspaceDeps = Object.keys(pkgJson.dependencies).filter((dep) => {
            const spec = pkgJson.dependencies[dep];
            return (
              typeof spec === 'string' &&
              (spec.startsWith('workspace:') || spec.startsWith('file:../'))
            );
          });
          if (workspaceDeps.length > 0) {
            console.log(`     Workspace Dependencies: ${workspaceDeps.join(', ')}`);
          }
        }
        console.log('');
      } catch (e) {
        // Skip malformed packages
      }
    });
  }

  /**
   * Check for suspicious packages
   */
  async checkForSuspiciousPackages() {
    console.log('🔍 Checking for Suspicious Patterns:\n');

    Object.keys(this.workspacePackages).forEach(pkgName => {
      const pkgPath = this.workspacePackages[pkgName];
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      
      if (!fs.existsSync(pkgJsonPath)) return;

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        // Check for postinstall scripts
        if (pkgJson.scripts && pkgJson.scripts.postinstall) {
          this.findings.push({
            severity: 'WARNING',
            type: 'POSTINSTALL_SCRIPT',
            package: pkgJson.name,
            version: pkgJson.version,
            message: `Workspace package "${pkgJson.name}" has postinstall script`,
            script: pkgJson.scripts.postinstall
          });
        }

        // Check for suspicious file access
        const postinstallPath = path.join(pkgPath, 'postinstall.js');
        if (fs.existsSync(postinstallPath)) {
          const postinstallContent = fs.readFileSync(postinstallPath, 'utf8');
          if (postinstallContent.includes('localhost:3000') || 
              postinstallContent.includes('/collect')) {
            this.findings.push({
              severity: 'CRITICAL',
              type: 'MALICIOUS_POSTINSTALL',
              package: pkgJson.name,
              version: pkgJson.version,
              message: `Workspace package "${pkgJson.name}" has suspicious postinstall script`,
              details: 'Postinstall script contains network requests'
            });
          }
        }
      } catch (e) {
        // Skip
      }
    });
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Scan Results');
    console.log('='.repeat(60));

    console.log(`Total Workspace Packages: ${Object.keys(this.workspacePackages).length}`);
    console.log(`Findings: ${this.findings.length}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ No suspicious workspace packages found!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    this.findings.forEach(finding => {
      const icon = finding.severity === 'CRITICAL' ? '🚨' :
                   finding.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (finding.script) {
        console.log(`   Script: ${finding.script}`);
      }
      if (finding.details) {
        console.log(`   Details: ${finding.details}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    
    if (this.findings.some(f => f.severity === 'CRITICAL')) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const workspaceRoot = process.argv[2] || process.cwd();
  const scanner = new WorkspaceScanner(workspaceRoot);
  scanner.scan();
}

module.exports = WorkspaceScanner;
