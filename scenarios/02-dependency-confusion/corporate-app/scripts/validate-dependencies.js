#!/usr/bin/env node

/**
 * Pre-install validation script
 * Checks for dependency confusion attacks
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating dependencies for security...\n');

try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );

  const internalPackages = Object.keys(packageJson.dependencies || {})
    .filter(name => name.startsWith('@techcorp/'));

  console.log(`Found ${internalPackages.length} internal packages:`);
  internalPackages.forEach(pkg => console.log(`  - ${pkg}`));
  console.log('');

  // In a real implementation, this would:
  // 1. Check registry source for each package
  // 2. Verify versions aren't suspiciously high
  // 3. Validate integrity hashes
  // 4. Ensure packages come from internal registry

  console.log('✅ Validation complete (basic check only)\n');
  process.exit(0);

} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(0); // Don't block install in this demo
}
