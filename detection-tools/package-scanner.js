#!/usr/bin/env node

/**
 * Package Security Scanner
 * Scans Node.js projects for potential supply chain vulnerabilities.
 * Supports text, JSON, and SARIF outputs for CI integration.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_KEYS = ['preinstall', 'install', 'postinstall', 'prepare'];
const MAX_SINGLE_FILE_BYTES = 256 * 1024;
const DEFAULT_MAX_SCAN_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_SCANNED_FILES = 2000;

const MALICIOUS_PATTERNS = [
  { pattern: /eval\s*\(/g, name: 'eval() usage', severity: 'WARNING', ruleId: 'js-eval-usage' },
  { pattern: /Function\s*\(/g, name: 'Function constructor', severity: 'WARNING', ruleId: 'js-function-constructor' },
  { pattern: /child_process/g, name: 'child_process access', severity: 'INFO', ruleId: 'js-child-process' },
  { pattern: /\bexec(?:Sync)?\s*\(/g, name: 'exec usage', severity: 'WARNING', ruleId: 'js-exec-usage' },
  { pattern: /(?:https?:\/\/|fetch\s*\(|XMLHttpRequest)/g, name: 'network access pattern', severity: 'INFO', ruleId: 'js-network-access' },
  { pattern: /Buffer\.from\([^,]+,\s*['"]base64['"]\)/g, name: 'base64 decode', severity: 'INFO', ruleId: 'js-base64-decode' }
];

class PackageScanner {
  constructor(projectPath, options = {}) {
    this.projectPath = path.resolve(projectPath);
    this.options = {
      maxScanBytes: options.maxScanBytes || DEFAULT_MAX_SCAN_BYTES,
      maxScannedFiles: options.maxScannedFiles || DEFAULT_MAX_SCANNED_FILES
    };
    this.findings = [];
    this.scannedBytes = 0;
    this.scannedFiles = 0;
    this.stats = {
      totalPackages: 0,
      scannedPackages: 0,
      suspiciousPackages: 0,
      criticalFindings: 0,
      warningFindings: 0,
      infoFindings: 0
    };
  }

  async scan() {
    try {
      await this.scanRootPackageJson();
      await this.scanNodeModules();
      await this.checkForTyposquatting();
      await this.checkForDependencyConfusion();
    } catch (error) {
      this.addFinding('ERROR', `Scan failed: ${error.message}`, 'SCANNER_ERROR');
    }
    return this.buildResult();
  }

  async scanRootPackageJson() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addFinding('ERROR', 'No package.json found', 'FILE_NOT_FOUND', { file: packageJsonPath });
      return;
    }

    const packageJson = this.readJson(packageJsonPath);
    if (!packageJson) {
      this.addFinding('ERROR', 'Unable to parse root package.json', 'PARSE_ERROR', { file: packageJsonPath });
      return;
    }

    const allDeps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.optionalDependencies || {})
    };
    this.stats.totalPackages = Object.keys(allDeps).length;

    this.scanScriptsForRisk(packageJson.scripts || {}, {
      packageName: packageJson.name || '(root)',
      file: packageJsonPath,
      source: 'root-package-json'
    });
  }

  async scanNodeModules() {
    const nodeModulesPath = path.join(this.projectPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) return;

    const packageDirs = this.getInstalledPackageDirs(nodeModulesPath);
    this.stats.scannedPackages = packageDirs.length;

    for (const pkgDir of packageDirs) {
      const pkgJsonPath = path.join(pkgDir, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;
      const pkgJson = this.readJson(pkgJsonPath);
      if (!pkgJson) continue;

      const packageName = pkgJson.name || path.basename(pkgDir);
      this.checkPackageVersionAnomaly(packageName, pkgJson.version, pkgJsonPath);
      this.scanScriptsForRisk(pkgJson.scripts || {}, {
        packageName,
        file: pkgJsonPath,
        source: 'installed-package-json'
      });
      this.scanJavaScriptFilesInPackage(pkgDir, packageName);
    }
  }

  scanScriptsForRisk(scripts, context) {
    for (const key of SCRIPT_KEYS) {
      const scriptValue = scripts[key];
      if (!scriptValue || typeof scriptValue !== 'string') continue;

      this.addFinding(
        'INFO',
        `Package "${context.packageName}" defines ${key} script`,
        'INSTALL_LIFECYCLE_SCRIPT',
        { package: context.packageName, scriptKey: key, script: scriptValue, file: context.file }
      );

      if (/(curl|wget|Invoke-WebRequest|certutil)/i.test(scriptValue)) {
        this.addFinding(
          'WARNING',
          `Script "${key}" in "${context.packageName}" contains network fetch behavior`,
          'SUSPICIOUS_SCRIPT_NETWORK',
          { package: context.packageName, scriptKey: key, script: scriptValue, file: context.file }
        );
      }

      if (/(rm\s+-rf|del\s+\/f|powershell\s+-enc|chmod\s+\+x)/i.test(scriptValue)) {
        this.addFinding(
          'WARNING',
          `Script "${key}" in "${context.packageName}" contains potentially destructive or stealth behavior`,
          'SUSPICIOUS_SCRIPT_STEALTH',
          { package: context.packageName, scriptKey: key, script: scriptValue, file: context.file }
        );
      }
    }
  }

  checkPackageVersionAnomaly(packageName, version, pkgJsonPath) {
    if (!version || typeof version !== 'string') return;
    const major = Number.parseInt(version.split('.')[0], 10);
    if (Number.isFinite(major) && major > 100) {
      this.addFinding(
        'CRITICAL',
        `Package "${packageName}" has suspicious high major version: ${version}`,
        'SUSPICIOUS_VERSION',
        { package: packageName, version, file: pkgJsonPath }
      );
    }
  }

  scanJavaScriptFilesInPackage(pkgDir, packageName) {
    const queue = [pkgDir];
    while (queue.length > 0) {
      if (this.scannedFiles >= this.options.maxScannedFiles) return;
      if (this.scannedBytes >= this.options.maxScanBytes) return;

      const currentDir = queue.pop();
      let entries = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
          queue.push(fullPath);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith('.js')) continue;

        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }
        if (stat.size > MAX_SINGLE_FILE_BYTES) continue;
        if (this.scannedBytes + stat.size > this.options.maxScanBytes) return;

        this.scannedFiles += 1;
        this.scannedBytes += stat.size;
        this.scanSingleJavaScriptFile(fullPath, packageName);
      }
    }
  }

  scanSingleJavaScriptFile(filePath, packageName) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    for (const rule of MALICIOUS_PATTERNS) {
      const matches = content.match(rule.pattern);
      if (!matches || matches.length === 0) continue;
      const threshold = rule.severity === 'WARNING' ? 3 : 5;
      if (matches.length < threshold) continue;
      this.addFinding(
        rule.severity,
        `Package "${packageName}" contains repeated ${rule.name} (${matches.length})`,
        'MALICIOUS_PATTERN',
        { package: packageName, file: filePath, pattern: rule.name, count: matches.length, ruleId: rule.ruleId }
      );
    }
  }

  async checkForTyposquatting() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;
    const packageJson = this.readJson(packageJsonPath);
    if (!packageJson) return;

    const popularPackages = [
      'express', 'react', 'vue', 'angular', 'lodash', 'axios',
      'moment', 'jquery', 'webpack', 'babel', 'typescript'
    ];
    const allDeps = Object.keys({
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    });

    for (const dep of allDeps) {
      for (const popular of popularPackages) {
        const distance = this.levenshteinDistance(dep, popular);
        if (distance > 0 && distance <= 2 && dep !== popular) {
          this.addFinding(
            'WARNING',
            `Possible typosquatting: "${dep}" is similar to "${popular}"`,
            'TYPOSQUATTING',
            { package: dep, similar: popular, distance }
          );
        }
      }
    }
  }

  async checkForDependencyConfusion() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;
    const packageJson = this.readJson(packageJsonPath);
    if (!packageJson) return;

    const allDeps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    const scopedPackages = Object.keys(allDeps).filter((name) => name.startsWith('@'));
    for (const pkg of scopedPackages) {
      const installed = path.join(this.projectPath, 'node_modules', pkg, 'package.json');
      if (!fs.existsSync(installed)) continue;
      const installedPkg = this.readJson(installed);
      if (!installedPkg || !installedPkg.version) continue;
      const major = Number.parseInt(installedPkg.version.split('.')[0], 10);
      if (Number.isFinite(major) && major > 100) {
        this.addFinding(
          'CRITICAL',
          `Scoped package "${pkg}" may indicate dependency confusion (version ${installedPkg.version})`,
          'DEPENDENCY_CONFUSION',
          { package: pkg, version: installedPkg.version, file: installed }
        );
      }
    }

    const npmrcPath = path.join(this.projectPath, '.npmrc');
    if (!fs.existsSync(npmrcPath) && scopedPackages.length > 0) {
      this.addFinding(
        'WARNING',
        'No .npmrc found while scoped packages are present. Consider explicit registry scope mapping.',
        'MISSING_NPMRC'
      );
    }
  }

  getInstalledPackageDirs(nodeModulesPath) {
    const packageDirs = [];
    let entries = [];
    try {
      entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
    } catch {
      return packageDirs;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(nodeModulesPath, entry.name);
      if (entry.name.startsWith('@')) {
        let scopedEntries = [];
        try {
          scopedEntries = fs.readdirSync(fullPath, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const scopedEntry of scopedEntries) {
          if (!scopedEntry.isDirectory()) continue;
          packageDirs.push(path.join(fullPath, scopedEntry.name));
        }
      } else {
        packageDirs.push(fullPath);
      }
    }
    return packageDirs;
  }

  readJson(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  }

  addFinding(severity, message, type, details = {}) {
    this.findings.push({
      severity,
      message,
      type,
      details,
      timestamp: new Date().toISOString()
    });
    this.stats.suspiciousPackages += 1;
    if (severity === 'CRITICAL') this.stats.criticalFindings += 1;
    else if (severity === 'WARNING') this.stats.warningFindings += 1;
    else this.stats.infoFindings += 1;
  }

  buildResult() {
    const exitCode = this.stats.criticalFindings > 0 ? 2 : this.findings.length > 0 ? 1 : 0;
    return {
      projectPath: this.projectPath,
      stats: {
        ...this.stats,
        scannedFiles: this.scannedFiles,
        scannedBytes: this.scannedBytes
      },
      findings: this.findings,
      exitCode
    };
  }

  toSarif(result) {
    const rules = new Map();
    for (const finding of result.findings) {
      const ruleId = finding.details.ruleId || finding.type;
      if (rules.has(ruleId)) continue;
      rules.set(ruleId, {
        id: ruleId,
        name: ruleId,
        shortDescription: { text: finding.type },
        fullDescription: { text: finding.message },
        defaultConfiguration: { level: this.mapSarifLevel(finding.severity) }
      });
    }

    const sarifResults = result.findings.map((finding) => ({
      ruleId: finding.details.ruleId || finding.type,
      level: this.mapSarifLevel(finding.severity),
      message: { text: finding.message },
      locations: finding.details.file
        ? [{
            physicalLocation: {
              artifactLocation: { uri: path.relative(this.projectPath, finding.details.file) || finding.details.file }
            }
          }]
        : undefined
    }));

    return {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'package-scanner',
            informationUri: 'https://github.com/RAJANAGORI/supply-chain-attack-simulator',
            rules: Array.from(rules.values())
          }
        },
        results: sarifResults
      }]
    };
  }

  mapSarifLevel(severity) {
    if (severity === 'CRITICAL' || severity === 'ERROR') return 'error';
    if (severity === 'WARNING') return 'warning';
    return 'note';
  }

  renderTextReport(result) {
    const lines = [];
    lines.push('🔍 Package Security Scanner');
    lines.push('='.repeat(60));
    lines.push(`Scanning: ${result.projectPath}`);
    lines.push('');
    lines.push(`Total Packages: ${result.stats.totalPackages}`);
    lines.push(`Scanned Packages: ${result.stats.scannedPackages}`);
    lines.push(`Scanned JS Files: ${result.stats.scannedFiles}`);
    lines.push(`Scanned Bytes: ${result.stats.scannedBytes}`);
    lines.push(`Critical Findings: ${result.stats.criticalFindings}`);
    lines.push(`Warning Findings: ${result.stats.warningFindings}`);
    lines.push(`Info Findings: ${result.stats.infoFindings}`);
    lines.push('='.repeat(60));
    if (result.findings.length === 0) {
      lines.push('✅ No security issues found.');
      return lines.join('\n');
    }

    lines.push('Findings:');
    for (const finding of result.findings) {
      const icon = finding.severity === 'CRITICAL' ? '🚨' : finding.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      lines.push(`${icon} [${finding.severity}] ${finding.message}`);
      if (Object.keys(finding.details || {}).length > 0) {
        lines.push(`   Details: ${JSON.stringify(finding.details)}`);
      }
    }
    lines.push('='.repeat(60));
    return lines.join('\n');
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i += 1) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i += 1) {
      for (let j = 1; j <= str1.length; j += 1) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
        else {
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

function parseArgs(argv) {
  const args = { projectPath: process.cwd(), format: 'text', outputPath: '' };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') args.format = 'json';
    else if (arg === '--sarif') args.format = 'sarif';
    else if (arg === '--format') args.format = argv[++i] || 'text';
    else if (arg === '--output') args.outputPath = argv[++i] || '';
    else positional.push(arg);
  }
  if (positional[0]) args.projectPath = positional[0];
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scanner = new PackageScanner(args.projectPath);
  const result = await scanner.scan();

  let payload;
  if (args.format === 'json') payload = JSON.stringify(result, null, 2);
  else if (args.format === 'sarif') payload = JSON.stringify(scanner.toSarif(result), null, 2);
  else payload = scanner.renderTextReport(result);

  if (args.outputPath) fs.writeFileSync(path.resolve(args.outputPath), payload, 'utf8');
  else process.stdout.write(`${payload}\n`);

  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`package-scanner failed: ${error.message}\n`);
    process.exitCode = 3;
  });
}

module.exports = PackageScanner;

