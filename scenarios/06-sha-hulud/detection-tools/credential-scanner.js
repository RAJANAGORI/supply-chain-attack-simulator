#!/usr/bin/env node

/**
 * Credential Scanner
 * Scans for exposed credentials in files and environment
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function scanForCredentials(projectPath) {
  console.log('🔍 Scanning for exposed credentials...\n');
  
  const credentialFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(projectPath, '.npmrc'),
    path.join(projectPath, '.env'),
    path.join(projectPath, '.env.local'),
    path.join(projectPath, '.gitconfig'),
  ];
  
  const envVars = [
    'NPM_TOKEN',
    'GITHUB_TOKEN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AZURE_CLIENT_SECRET',
    'GCP_SERVICE_ACCOUNT_KEY',
  ];
  
  console.log('Scanning files:');
  console.log('');
  
  let foundFiles = [];
  
  credentialFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`  ⚠️  FOUND: ${filePath}`);
        
        // Check for tokens
        if (filePath.includes('.npmrc')) {
          const tokenMatch = content.match(/_authToken=(.+)/);
          if (tokenMatch) {
            console.log(`     Contains: npm token`);
            foundFiles.push({ file: filePath, type: 'npm_token' });
          }
        }
        
        if (filePath.includes('.env')) {
          const hasSecrets = /(PASSWORD|SECRET|KEY|TOKEN)=/i.test(content);
          if (hasSecrets) {
            console.log(`     Contains: environment secrets`);
            foundFiles.push({ file: filePath, type: 'env_secrets' });
          }
        }
      } else {
        console.log(`  ✅ NOT FOUND: ${filePath}`);
      }
    } catch (e) {
      // Silently fail
    }
  });
  
  console.log('');
  console.log('Scanning environment variables:');
  console.log('');
  
  let foundEnv = [];
  
  envVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ⚠️  FOUND: ${varName}`);
      foundEnv.push(varName);
    } else {
      console.log(`  ✅ NOT FOUND: ${varName}`);
    }
  });
  
  console.log('');
  console.log('='.repeat(60));
  if (foundFiles.length > 0 || foundEnv.length > 0) {
    console.log('⚠️  EXPOSED CREDENTIALS DETECTED\n');
    if (foundFiles.length > 0) {
      console.log('Files with credentials:');
      foundFiles.forEach(item => {
        console.log(`  - ${item.file} (${item.type})`);
      });
      console.log('');
    }
    if (foundEnv.length > 0) {
      console.log('Environment variables with credentials:');
      foundEnv.forEach(varName => console.log(`  - ${varName}`));
      console.log('');
    }
    console.log('Recommendation:');
    console.log('  - Use secret management tools (Vault, Secrets Manager)');
    console.log('  - Never commit credentials to repositories');
    console.log('  - Rotate credentials regularly');
    console.log('  - Use .gitignore for credential files');
  } else {
    console.log('✅ No exposed credentials detected');
  }
  console.log('='.repeat(60));
}

const projectPath = process.argv[2] || process.cwd();
scanForCredentials(projectPath);

