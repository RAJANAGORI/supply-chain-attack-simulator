/**
 * VICTIM APPLICATION
 * 
 * This application has a clean package.json
 * BUT the package-lock.json has been manipulated to include a malicious package
 * 
 * When npm install or npm ci runs, it installs the malicious package
 * even though it's not in package.json
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
  try {
    require('evil-utils');
    evilUtilsInstalled = true;
  } catch (e) {
    // Package not installed
  }
  
  res.json({
    message: 'Victim application running',
    data: doubled,
    dependencies: {
      express: require('express/package.json').version,
      lodash: require('lodash/package.json').version
    },
    warning: evilUtilsInstalled ? 
      '⚠️ WARNING: evil-utils detected (not in package.json!)' : 
      'No suspicious packages detected'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Victim app running on http://localhost:${PORT}`);
  console.log('📦 Expected dependencies: express, lodash');
  console.log('');
  
  // Check for malicious package
  try {
    require('evil-utils');
    console.log('⚠️  WARNING: evil-utils package detected!');
    console.log('   This package is NOT in package.json');
    console.log('   It was installed via package-lock.json manipulation');
    console.log('');
  } catch (e) {
    console.log('✅ No malicious packages detected');
  }
  
  console.log('Check captured data:');
  console.log('  curl http://localhost:3000/captured-data');
  console.log('');
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates malicious local packages and lockfile review:
//
// 1. package.json includes a suspicious file: dependency (evil-utils)
// 2. Lockfile records resolved paths and install scripts
// 3. npm install runs postinstall on evil-utils when TESTBENCH_MODE is enabled
// 4. Data is exfiltrated to the mock server on localhost
//
// Why this is dangerous:
// - file: and tarball dependencies are easy to miss in review
// - Attack persists through CI/CD pipelines
// - Developers may not notice the lock file was modified
// - npm ci trusts the lock file completely
// - Can bypass package.json security reviews
//
// Real-world impact:
// - Malicious packages installed in production
// - CI/CD pipelines compromised
// - Data exfiltration from build systems
// - Credential theft
// ============================================================================


