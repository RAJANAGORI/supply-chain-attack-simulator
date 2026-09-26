#!/usr/bin/env node

/**
 * Post-Install Script Monitor
 * Detects suspicious postinstall scripts, token theft, and worm replication.
 */

const fs = require('fs');
const path = require('path');

function scanPackage(packagePath) {
  console.log('Scanning for postinstall scripts and token-theft patterns...\n');

  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.error('package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};

  console.log(`Package: ${packageJson.name}@${packageJson.version}`);
  console.log('');

  if (scripts.postinstall) {
    console.log('POSTINSTALL SCRIPT FOUND:');
    console.log('');
    console.log(scripts.postinstall);
    console.log('');

    const suspiciousPatterns = [
      { pattern: /\.npmrc/, name: 'Reads npmrc token store' },
      { pattern: /\.git-credentials/, name: 'Reads GitHub credentials store' },
      { pattern: /127\.0\.0\.1:3001/, name: 'Beacons to local credential harvester' },
      { pattern: /127\.0\.0\.1:3003\/publish|localhost:3003\/publish/, name: 'Contacts mock registry publish endpoint' },
      { pattern: /127\.0\.0\.1:3002\/backdoor-pr|localhost:3002\/backdoor-pr/, name: 'Contacts backdoor PR endpoint' },
      { pattern: /_authToken|authToken/, name: 'npm authToken reference' },
      { pattern: /ghp_[A-Za-z0-9_]{30,}/, name: 'GitHub personal access token pattern' },
      { pattern: /process\.env/, name: 'Environment variable access' }
    ];

    console.log('Scanning for suspicious patterns:');
    console.log('');

    const found = [];

    suspiciousPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(scripts.postinstall)) {
        console.log(`  FOUND: ${name}`);
        found.push(name);
      } else {
        console.log(`  NOT FOUND: ${name}`);
      }
    });

    console.log('');
    console.log('='.repeat(60));
    if (found.length > 0) {
      console.log('SUSPICIOUS POSTINSTALL SCRIPT DETECTED\n');
      found.forEach((item) => console.log(`  - ${item}`));
      console.log('\nRecommendation: Run npm ci --ignore-scripts and review the package manually.');
    } else {
      console.log('No obvious suspicious patterns detected');
      console.log('However, postinstall scripts should still be reviewed.');
    }
    console.log('='.repeat(60));
  } else {
    console.log('No postinstall script found');
  }
}

const packagePath = process.argv[2] || process.cwd();
scanPackage(packagePath);
