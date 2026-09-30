#!/usr/bin/env node

/**
 * Credential Scanner
 * Scans for exposed npm and GitHub tokens in common credential stores.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function scanForCredentials(projectPath) {
  console.log('Scanning for exposed credentials...\n');

  const credentialFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(os.homedir(), '.git-credentials'),
    path.join(projectPath, '.npmrc'),
    path.join(projectPath, '.env'),
    path.join(projectPath, '.env.local')
  ];

  const envVars = [
    'NPM_TOKEN',
    'NODE_AUTH_TOKEN',
    'GITHUB_TOKEN',
    'GH_TOKEN'
  ];

  console.log('Scanning files:');
  console.log('');

  const foundFiles = [];

  credentialFiles.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`  FOUND: ${filePath}`);

        if (filePath.includes('.npmrc')) {
          const tokenMatch = content.match(/_authToken=(.+)/);
          if (tokenMatch) {
            console.log('     Contains: npm token');
            foundFiles.push({ file: filePath, type: 'npm_token' });
          }
        }

        if (filePath.includes('.git-credentials')) {
          const tokenMatch = content.match(/ghp_[A-Za-z0-9_]{30,}/);
          if (tokenMatch) {
            console.log('     Contains: GitHub token');
            foundFiles.push({ file: filePath, type: 'github_token' });
          }
        }

        if (filePath.includes('.env')) {
          const hasSecrets = /(NPM_TOKEN|NODE_AUTH_TOKEN|GITHUB_TOKEN|GH_TOKEN)=/i.test(content);
          if (hasSecrets) {
            console.log('     Contains: environment secrets');
            foundFiles.push({ file: filePath, type: 'env_secrets' });
          }
        }
      } else {
        console.log(`  NOT FOUND: ${filePath}`);
      }
    } catch (e) {
      // Silently fail
    }
  });

  console.log('');
  console.log('Scanning environment variables:');
  console.log('');

  const foundEnv = [];

  envVars.forEach((varName) => {
    if (process.env[varName]) {
      console.log(`  FOUND: ${varName}`);
      foundEnv.push(varName);
    } else {
      console.log(`  NOT FOUND: ${varName}`);
    }
  });

  console.log('');
  console.log('='.repeat(60));
  if (foundFiles.length > 0 || foundEnv.length > 0) {
    console.log('EXPOSED CREDENTIALS DETECTED\n');
    if (foundFiles.length > 0) {
      console.log('Files with credentials:');
      foundFiles.forEach((item) => {
        console.log(`  - ${item.file} (${item.type})`);
      });
      console.log('');
    }
    if (foundEnv.length > 0) {
      console.log('Environment variables with credentials:');
      foundEnv.forEach((varName) => console.log(`  - ${varName}`));
      console.log('');
    }
    console.log('Recommendation:');
    console.log('  - Store publish tokens in CI secrets, not developer machines.');
    console.log('  - Never commit credentials to repositories.');
    console.log('  - Rotate tokens immediately after suspected compromise.');
    console.log('  - Use .gitignore for credential files and .env files.');
  } else {
    console.log('No exposed credentials detected');
  }
  console.log('='.repeat(60));
}

const projectPath = process.argv[2] || process.cwd();
scanForCredentials(projectPath);
