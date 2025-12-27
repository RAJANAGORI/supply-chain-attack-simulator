/**
 * COMPROMISED APPLICATION
 * 
 * This application has been PRE-COMPROMISED by an attacker
 * The package-lock.json has already been manipulated to include evil-utils
 * 
 * This represents a scenario where:
 * - An attacker has committed a manipulated lock file to the repository
 * - The package.json still appears clean
 * - When npm install or npm ci runs, it will install the malicious package
 */

const express = require('express');
const _ = require('lodash');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  const data = [1, 2, 3, 4, 5];
  const doubled = _.map(data, x => x * 2);
  
  // Check if evil-utils was installed (it shouldn't be in package.json!)
  let evilUtilsInstalled = false;
  let evilUtilsVersion = null;
  try {
    const evilUtils = require('evil-utils');
    evilUtilsInstalled = true;
    evilUtilsVersion = require('evil-utils/package.json').version;
  } catch (e) {
    // Package not installed yet - will be installed when npm install runs
  }
  
  res.json({
    message: 'Compromised application (pre-manipulated lock file)',
    status: evilUtilsInstalled ? 'COMPROMISED' : 'LOCK_FILE_MANIPULATED',
    data: doubled,
    dependencies: {
      express: require('express/package.json').version,
      lodash: require('lodash/package.json').version
    },
    warning: evilUtilsInstalled ? 
      `⚠️ WARNING: evil-utils@${evilUtilsVersion} detected (not in package.json!)` : 
      '⚠️ WARNING: package-lock.json contains evil-utils (run npm install to trigger)'
  });
});

app.get('/check', (req, res) => {
  // Endpoint to check if malicious package is installed
  try {
    require('evil-utils');
    res.json({
      compromised: true,
      message: 'evil-utils is installed and active',
      package: 'evil-utils',
      version: require('evil-utils/package.json').version,
      note: 'This package is NOT in package.json but is in package-lock.json'
    });
  } catch (e) {
    res.json({
      compromised: false,
      message: 'evil-utils not yet installed',
      note: 'Run npm install to install packages from package-lock.json',
      instruction: 'The lock file contains evil-utils, but it needs to be installed first'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚨 Compromised app running on http://localhost:${PORT}`);
  console.log('📦 Expected dependencies: express, lodash');
  console.log('');
  
  // Check for malicious package
  try {
    require('evil-utils');
    const version = require('evil-utils/package.json').version;
    console.log('🚨 COMPROMISED: evil-utils@' + version + ' is installed!');
    console.log('   This package is NOT in package.json');
    console.log('   It was installed via manipulated package-lock.json');
    console.log('');
  } catch (e) {
    console.log('⚠️  WARNING: package-lock.json contains evil-utils');
    console.log('   Run: npm install');
    console.log('   This will install the malicious package from the lock file');
    console.log('');
  }
  
  console.log('Endpoints:');
  console.log('  GET /      - Main application');
  console.log('  GET /check - Check if compromised');
  console.log('');
  console.log('Check captured data:');
  console.log('  curl http://localhost:3000/captured-data');
  console.log('');
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This represents a PRE-COMPROMISED application:
//
// 1. Attacker has already manipulated package-lock.json
// 2. The manipulated lock file has been committed to the repository
// 3. package.json still appears clean (only express and lodash)
// 4. When developer or CI/CD runs npm install, evil-utils gets installed
// 5. Malicious postinstall script executes automatically
// 6. Data is exfiltrated even though package.json is clean
//
// Attack scenarios:
// - Attacker commits manipulated lock file to git repository
// - Malicious pull request includes manipulated lock file
// - CI/CD system uses lock file and installs malicious package
// - Developer pulls changes and runs npm install
//
// Why this is dangerous:
// - package.json appears legitimate in code reviews
// - Lock file changes are often overlooked
// - npm ci trusts lock file completely
// - Attack persists through git commits
// ============================================================================

