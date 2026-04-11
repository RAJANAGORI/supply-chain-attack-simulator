#!/usr/bin/env node

/**
 * Update Scanner
 * Detects potential malicious updates
 */

const fs = require('fs');
const path = require('path');

function scanProject(projectPath) {
  console.log('🔍 Scanning for malicious updates...\n');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  console.log('Checking dependencies for version ranges:\n');
  
  let suspicious = [];
  
  Object.keys(allDeps).forEach(pkgName => {
    const version = allDeps[pkgName];
    
    // Check for version ranges that allow automatic updates
    if (version.startsWith('^') || version.startsWith('~') || version === '*' || version === 'latest') {
      console.log(`⚠️  ${pkgName}: ${version} (allows automatic updates)`);
      suspicious.push({ package: pkgName, version, reason: 'Version range allows automatic updates' });
    } else {
      console.log(`✅ ${pkgName}: ${version} (pinned version)`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  if (suspicious.length > 0) {
    console.log('⚠️  DEPENDENCIES WITH AUTOMATIC UPDATES DETECTED\n');
    suspicious.forEach(item => {
      console.log(`Package: ${item.package}`);
      console.log(`Version: ${item.version}`);
      console.log(`Reason: ${item.reason}\n`);
    });
    console.log('Recommendation: Pin exact versions in production');
  } else {
    console.log('✅ All dependencies use pinned versions');
  }
  console.log('='.repeat(60));
}

const projectPath = process.argv[2] || process.cwd();
scanProject(projectPath);
