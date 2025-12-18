#!/usr/bin/env node

/**
 * Post-Install Script Monitor
 * Detects suspicious postinstall scripts in packages
 */

const fs = require('fs');
const path = require('path');

function scanPackage(packagePath) {
  console.log('🔍 Scanning for postinstall scripts...\n');
  
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  console.log(`Package: ${packageJson.name}@${packageJson.version}`);
  console.log('');
  
  if (scripts.postinstall) {
    console.log('⚠️  POSTINSTALL SCRIPT FOUND:');
    console.log('');
    console.log(scripts.postinstall);
    console.log('');
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /http|https/, name: 'Network request' },
      { pattern: /eval|Function/, name: 'Code execution' },
      { pattern: /process\.env/, name: 'Environment variable access' },
      { pattern: /curl|wget|fetch/, name: 'Network download' },
      { pattern: /bundle\.js/, name: 'Bundle.js download' }
    ];
    
    console.log('Scanning for suspicious patterns:');
    console.log('');
    
    let found = [];
    
    suspiciousPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(scripts.postinstall)) {
        console.log(`  ⚠️  FOUND: ${name}`);
        found.push(name);
      } else {
        console.log(`  ✅ NOT FOUND: ${name}`);
      }
    });
    
    console.log('');
    console.log('='.repeat(60));
    if (found.length > 0) {
      console.log('⚠️  SUSPICIOUS POSTINSTALL SCRIPT DETECTED\n');
      found.forEach(item => console.log(`  - ${item}`));
      console.log('\nRecommendation: Review postinstall script carefully');
      console.log('Consider: npm config set ignore-scripts true');
    } else {
      console.log('✅ No obvious suspicious patterns detected');
      console.log('⚠️  However, postinstall scripts should still be reviewed');
    }
    console.log('='.repeat(60));
  } else {
    console.log('✅ No postinstall script found');
  }
}

const packagePath = process.argv[2] || process.cwd();
scanPackage(packagePath);

