#!/usr/bin/env node

/**
 * Submodule Validator
 * Validates git submodules and detects malicious submodules
 */

const fs = require('fs');
const path = require('path');

class SubmoduleValidator {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.findings = [];
    this.gitmodulesPath = path.join(repoPath, '.gitmodules');
  }

  /**
   * Validate submodules
   */
  async validate() {
    console.log('🔍 Submodule Validator');
    console.log('='.repeat(60));
    console.log(`Validating: ${this.repoPath}\n`);

    try {
      await this.checkGitmodulesExists();
      await this.parseGitmodules();
      await this.validateSubmoduleUrls();
      await this.checkSubmoduleContent();
      await this.analyzeSubmoduleScripts();
      this.generateReport();
      
      return this.findings.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  /**
   * Check if .gitmodules exists
   */
  async checkGitmodulesExists() {
    if (!fs.existsSync(this.gitmodulesPath)) {
      console.log('ℹ️  No .gitmodules file found (no submodules)');
      return false;
    }
    console.log('✅ .gitmodules file found');
    console.log('');
    return true;
  }

  /**
   * Parse .gitmodules file
   */
  async parseGitmodules() {
    if (!fs.existsSync(this.gitmodulesPath)) return;

    const content = fs.readFileSync(this.gitmodulesPath, 'utf8');
    const submodules = [];
    
    let currentSubmodule = null;
    content.split('\n').forEach(line => {
      if (line.startsWith('[submodule')) {
        if (currentSubmodule) {
          submodules.push(currentSubmodule);
        }
        const match = line.match(/"([^"]+)"/);
        currentSubmodule = { name: match ? match[1] : null, path: null, url: null };
      } else if (line.trim().startsWith('path')) {
        const match = line.match(/path\s*=\s*(.+)/);
        if (match && currentSubmodule) {
          currentSubmodule.path = match[1].trim();
        }
      } else if (line.trim().startsWith('url')) {
        const match = line.match(/url\s*=\s*(.+)/);
        if (match && currentSubmodule) {
          currentSubmodule.url = match[1].trim();
        }
      }
    });
    
    if (currentSubmodule) {
      submodules.push(currentSubmodule);
    }

    this.submodules = submodules;
    
    console.log(`📦 Found ${submodules.length} submodule(s):\n`);
    submodules.forEach(sub => {
      console.log(`  - ${sub.name}`);
      console.log(`    Path: ${sub.path}`);
      console.log(`    URL: ${sub.url}`);
      console.log('');
    });

    return submodules;
  }

  /**
   * Validate submodule URLs
   */
  async validateSubmoduleUrls() {
    if (!this.submodules || this.submodules.length === 0) return;

    console.log('🔍 Validating submodule URLs...\n');

    this.submodules.forEach(sub => {
      // Check for suspicious URL patterns
      if (sub.url.startsWith('./') || sub.url.startsWith('../')) {
        this.findings.push({
          severity: 'WARNING',
          type: 'LOCAL_SUBMODULE_URL',
          submodule: sub.name,
          url: sub.url,
          message: `Submodule "${sub.name}" uses local/relative URL: ${sub.url}`,
          recommendation: 'Submodules should use absolute repository URLs'
        });
      }

      if (!sub.url.startsWith('http://') && !sub.url.startsWith('https://') && !sub.url.startsWith('git@')) {
        this.findings.push({
          severity: 'WARNING',
          type: 'SUSPICIOUS_SUBMODULE_URL',
          submodule: sub.name,
          url: sub.url,
          message: `Submodule "${sub.name}" has suspicious URL format: ${sub.url}`,
          recommendation: 'Verify submodule URL points to legitimate repository'
        });
      }

      // Check for known malicious patterns
      if (sub.url.includes('malicious') || sub.url.includes('evil') || sub.url.includes('hack')) {
        this.findings.push({
          severity: 'CRITICAL',
          type: 'MALICIOUS_SUBMODULE_URL',
          submodule: sub.name,
          url: sub.url,
          message: `Submodule "${sub.name}" has suspicious URL containing malicious keywords: ${sub.url}`,
          recommendation: 'IMMEDIATE: Review and remove this submodule'
        });
      }
    });

    console.log('✅ URL validation completed');
    console.log('');
  }

  /**
   * Check submodule content
   */
  async checkSubmoduleContent() {
    if (!this.submodules || this.submodules.length === 0) return;

    console.log('🔍 Checking submodule content...\n');

    this.submodules.forEach(sub => {
      const submodulePath = path.join(this.repoPath, sub.path || sub.name);
      
      if (fs.existsSync(submodulePath)) {
        // Check for postinstall scripts
        const postinstallPath = path.join(submodulePath, 'postinstall.sh');
        const postinstallJs = path.join(submodulePath, 'postinstall.js');
        
        if (fs.existsSync(postinstallPath) || fs.existsSync(postinstallJs)) {
          this.findings.push({
            severity: 'WARNING',
            type: 'POSTINSTALL_IN_SUBMODULE',
            submodule: sub.name,
            path: submodulePath,
            message: `Submodule "${sub.name}" contains postinstall script`,
            recommendation: 'Review postinstall script for malicious code'
          });

          // Check script content
          const scriptPath = fs.existsSync(postinstallPath) ? postinstallPath : postinstallJs;
          try {
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            if (scriptContent.includes('curl') || scriptContent.includes('wget') || scriptContent.includes('/collect')) {
              this.findings.push({
                severity: 'CRITICAL',
                type: 'MALICIOUS_SUBMODULE_SCRIPT',
                submodule: sub.name,
                message: `Submodule "${sub.name}" contains script with network exfiltration`,
                recommendation: 'CRITICAL: This submodule appears malicious!'
              });
            }
          } catch (e) {
            // Skip if can't read
          }
        }
      }
    });

    console.log('✅ Content check completed');
    console.log('');
  }

  /**
   * Analyze submodule scripts
   */
  async analyzeSubmoduleScripts() {
    if (!this.submodules || this.submodules.length === 0) return;

    console.log('🔍 Analyzing submodule scripts...\n');

    // This would check for suspicious patterns in submodule code
    // For now, we've already checked in checkSubmoduleContent
    
    console.log('✅ Script analysis completed');
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

    console.log(`Total Submodules: ${this.submodules ? this.submodules.length : 0}`);
    console.log(`Total Findings: ${this.findings.length}`);
    console.log(`  🚨 Critical: ${critical}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ Submodule validation passed!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    this.findings.forEach(finding => {
      const icon = finding.severity === 'CRITICAL' ? '🚨' : '⚠️';
      
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (finding.submodule) {
        console.log(`   Submodule: ${finding.submodule}`);
      }
      if (finding.url) {
        console.log(`   URL: ${finding.url}`);
      }
      if (finding.recommendation) {
        console.log(`   Recommendation: ${finding.recommendation}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    
    if (critical > 0) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const repoPath = process.argv[2] || process.cwd();
  const validator = new SubmoduleValidator(repoPath);
  validator.validate();
}

module.exports = SubmoduleValidator;

