#!/usr/bin/env node

/**
 * Dependency Tree Scanner
 * Scans dependency tree to identify transitive dependencies
 * and detect potential compromises
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DependencyTreeScanner {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.findings = [];
    this.dependencyTree = {};
  }

  /**
   * Scan the dependency tree
   */
  async scan() {
    console.log('🔍 Dependency Tree Scanner');
    console.log('='.repeat(60));
    console.log(`Scanning: ${this.projectPath}\n`);

    try {
      await this.buildDependencyTree();
      await this.analyzeTransitiveDependencies();
      await this.checkForSuspiciousPackages();
      this.generateReport();
      
      return this.findings.length > 0;
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      return false;
    }
  }

  /**
   * Build dependency tree from package-lock.json or node_modules
   */
  async buildDependencyTree() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    const packageLockPath = path.join(this.projectPath, 'package-lock.json');
    const nodeModulesPath = path.join(this.projectPath, 'node_modules');

    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const directDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    console.log('📦 Direct Dependencies:');
    Object.keys(directDeps).forEach(dep => {
      console.log(`  - ${dep}@${directDeps[dep]}`);
      this.dependencyTree[dep] = {
        version: directDeps[dep],
        direct: true,
        transitive: [],
        children: []
      };
    });
    console.log('');

    // Scan node_modules for transitive dependencies
    if (fs.existsSync(nodeModulesPath)) {
      await this.scanNodeModules(nodeModulesPath, Object.keys(directDeps));
    }

    // Try to use npm ls if available
    try {
      const npmLsOutput = execSync('npm ls --json', { 
        cwd: this.projectPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const tree = JSON.parse(npmLsOutput);
      this.parseNpmLsTree(tree);
    } catch (e) {
      console.log('ℹ️  npm ls not available, using node_modules scan');
    }
  }

  /**
   * Scan node_modules directory
   */
  async scanNodeModules(nodeModulesPath, directDeps) {
    const packages = fs.readdirSync(nodeModulesPath);
    
    for (const pkg of packages) {
      if (pkg.startsWith('.') || pkg.startsWith('@')) continue;
      
      const pkgPath = path.join(nodeModulesPath, pkg);
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      
      if (!fs.existsSync(pkgJsonPath)) continue;

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        const isDirect = directDeps.includes(pkg);
        
        if (!this.dependencyTree[pkg]) {
          this.dependencyTree[pkg] = {
            version: pkgJson.version,
            direct: isDirect,
            transitive: [],
            children: []
          };
        }

        // Check for postinstall scripts (suspicious)
        if (pkgJson.scripts && (pkgJson.scripts.postinstall || pkgJson.scripts.install)) {
          if (!isDirect) {
            this.findings.push({
              severity: 'WARNING',
              type: 'TRANSITIVE_POSTINSTALL',
              package: pkg,
              version: pkgJson.version,
              message: `Transitive dependency "${pkg}" has postinstall script`,
              script: pkgJson.scripts.postinstall || pkgJson.scripts.install
            });
          }
        }
      } catch (e) {
        // Skip malformed packages
      }
    }
  }

  /**
   * Parse npm ls output
   */
  parseNpmLsTree(tree) {
    if (tree.dependencies) {
      Object.keys(tree.dependencies).forEach(dep => {
        const depInfo = tree.dependencies[dep];
        if (!this.dependencyTree[dep]) {
          this.dependencyTree[dep] = {
            version: depInfo.version,
            direct: false,
            transitive: [],
            children: []
          };
        }
        
        if (depInfo.dependencies) {
          Object.keys(depInfo.dependencies).forEach(childDep => {
            const childInfo = depInfo.dependencies[childDep];
            if (!this.dependencyTree[childDep]) {
              this.dependencyTree[childDep] = {
                version: childInfo.version,
                direct: false,
                transitive: [dep],
                children: []
              };
            } else {
              if (!this.dependencyTree[childDep].transitive.includes(dep)) {
                this.dependencyTree[childDep].transitive.push(dep);
              }
            }
          });
        }
      });
    }
  }

  /**
   * Analyze transitive dependencies
   */
  async analyzeTransitiveDependencies() {
    console.log('🔍 Analyzing Transitive Dependencies:\n');
    
    const transitiveDeps = Object.keys(this.dependencyTree).filter(
      dep => !this.dependencyTree[dep].direct
    );

    console.log(`Found ${transitiveDeps.length} transitive dependencies:\n`);
    
    transitiveDeps.forEach(dep => {
      const info = this.dependencyTree[dep];
      console.log(`  📦 ${dep}@${info.version}`);
      console.log(`     Introduced by: ${info.transitive.join(', ') || 'unknown'}`);
      console.log('');
    });
  }

  /**
   * Check for suspicious packages
   */
  async checkForSuspiciousPackages() {
    console.log('🔍 Checking for Suspicious Patterns:\n');

    Object.keys(this.dependencyTree).forEach(pkg => {
      const info = this.dependencyTree[pkg];
      const pkgPath = path.join(this.projectPath, 'node_modules', pkg);
      const pkgJsonPath = path.join(pkgPath, 'package.json');

      if (!fs.existsSync(pkgJsonPath)) return;

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        // Check for postinstall scripts in transitive deps
        if (pkgJson.scripts && pkgJson.scripts.postinstall && !info.direct) {
          this.findings.push({
            severity: 'WARNING',
            type: 'TRANSITIVE_POSTINSTALL',
            package: pkg,
            version: pkgJson.version,
            message: `Transitive dependency "${pkg}" has postinstall script`,
            script: pkgJson.scripts.postinstall
          });
        }

        // Check for suspicious version numbers
        const [major] = pkgJson.version.split('.');
        if (parseInt(major) > 100 && !info.direct) {
          this.findings.push({
            severity: 'CRITICAL',
            type: 'SUSPICIOUS_VERSION',
            package: pkg,
            version: pkgJson.version,
            message: `Transitive dependency "${pkg}" has suspicious version: ${pkgJson.version}`
          });
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

    const directCount = Object.keys(this.dependencyTree).filter(
      d => this.dependencyTree[d].direct
    ).length;
    const transitiveCount = Object.keys(this.dependencyTree).filter(
      d => !this.dependencyTree[d].direct
    ).length;

    console.log(`Total Dependencies: ${Object.keys(this.dependencyTree).length}`);
    console.log(`  - Direct: ${directCount}`);
    console.log(`  - Transitive: ${transitiveCount}`);
    console.log(`Findings: ${this.findings.length}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ No suspicious transitive dependencies found!');
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
  const projectPath = process.argv[2] || process.cwd();
  const scanner = new DependencyTreeScanner(projectPath);
  scanner.scan();
}

module.exports = DependencyTreeScanner;

