#!/usr/bin/env node

/**
 * Secret Monitor
 * Monitors secret access during build process
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function monitorBuild(buildPath) {
  console.log('🔍 Monitoring build process for secret access...\n');
  
  const buildScript = path.join(buildPath, 'build.sh');
  
  if (!fs.existsSync(buildScript)) {
    console.error('❌ build.sh not found');
    return;
  }
  
  console.log('Monitoring build script:', buildScript);
  console.log('');
  
  // Check for suspicious patterns
  const scriptContent = fs.readFileSync(buildScript, 'utf8');
  
  const suspiciousPatterns = [
    { pattern: /curl.*localhost:3000/, name: 'Network request to localhost:3000' },
    { pattern: /\$AWS_ACCESS_KEY_ID/, name: 'AWS access key access' },
    { pattern: /\$AWS_SECRET_ACCESS_KEY/, name: 'AWS secret key access' },
    { pattern: /\$DATABASE_PASSWORD/, name: 'Database password access' },
    { pattern: /eval|exec/, name: 'Code execution' },
    { pattern: /process\.env/, name: 'Environment variable access' }
  ];
  
  console.log('Scanning for suspicious patterns:\n');
  
  let found = [];
  
  suspiciousPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(scriptContent)) {
      console.log(`⚠️  FOUND: ${name}`);
      found.push(name);
    } else {
      console.log(`✅ NOT FOUND: ${name}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  if (found.length > 0) {
    console.log('⚠️  SUSPICIOUS ACTIVITY DETECTED\n');
    found.forEach(item => console.log(`  - ${item}`));
    console.log('\nRecommendation: Review build script for malicious code');
  } else {
    console.log('✅ No obvious suspicious patterns detected');
  }
  console.log('='.repeat(60));
}

const buildPath = process.argv[2] || process.cwd();
monitorBuild(buildPath);

