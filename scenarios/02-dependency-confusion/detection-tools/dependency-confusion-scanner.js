#!/usr/bin/env node

/**
 * Dependency Confusion Scanner
 * Detects potential dependency confusion attacks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function scanProject(projectPath) {
  console.log('🔍 Scanning for Dependency Confusion vulnerabilities...\n');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageLockPath = path.join(projectPath, 'package-lock.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  // Check for scoped packages (potential private packages)
  const scopedPackages = Object.keys(allDeps).filter(name => name.startsWith('@'));
  
  console.log(`Found ${scopedPackages.length} scoped packages:\n`);
  
  let suspicious = [];
  
  scopedPackages.forEach(pkgName => {
    console.log(`Checking ${pkgName}...`);
    
    // Check if package is installed
    const nodeModulesPath = path.join(projectPath, 'node_modules', pkgName, 'package.json');
    
    if (fs.existsSync(nodeModulesPath)) {
      const installedPkg = JSON.parse(fs.readFileSync(nodeModulesPath, 'utf8'));
      
      // Check for suspicious version numbers
      const version = installedPkg.version;
      const [major] = version.split('.');
      
      if (parseInt(major) > 100) {
        console.log(`  ⚠️  SUSPICIOUS: Version ${version} is unusually high!`);
        suspicious.push({ package: pkgName, version, reason: 'High version number' });
      } else {
        console.log(`  ✅ Version ${version} looks normal`);
      }
    }
  });
  
  console.log('\n' + '='.repeat(60));
  if (suspicious.length > 0) {
    console.log('⚠️  POTENTIAL DEPENDENCY CONFUSION DETECTED\n');
    suspicious.forEach(item => {
      console.log(`Package: ${item.package}`);
      console.log(`Version: ${item.version}`);
      console.log(`Reason: ${item.reason}\n`);
    });
    process.exit(1);
  } else {
    console.log('✅ No obvious dependency confusion detected');
  }
  console.log('='.repeat(60));
}

const projectPath = process.argv[2] || process.cwd();
scanProject(projectPath);
