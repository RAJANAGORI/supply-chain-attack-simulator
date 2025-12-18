/**
 * VICTIM APPLICATION
 * Uses data-processor package (now compromised)
 */

console.log('🚀 Starting Application with data-processor...\n');

// Import the processor (could be compromised version)
const DataProcessor = require('data-processor');

console.log('📦 Loaded data-processor package\n');

// Simulate typical application usage
async function runApplication() {
  console.log('='.repeat(60));
  console.log('Testing Data Processing');
  console.log('='.repeat(60));
  console.log('');

  // Test data transformation
  console.log('1. Transforming data:');
  const data = [1, 2, 3, 4, 5];
  const doubled = DataProcessor.map(data, x => x * 2);
  console.log(`   Original: ${JSON.stringify(data)}`);
  console.log(`   Doubled: ${JSON.stringify(doubled)}`);
  console.log('');

  // Test filtering
  console.log('2. Filtering data:');
  const filtered = DataProcessor.filter(data, x => x > 2);
  console.log(`   Filtered (>2): ${JSON.stringify(filtered)}`);
  console.log('');

  // Test grouping
  console.log('3. Grouping data:');
  const users = [
    { name: 'Alice', role: 'admin' },
    { name: 'Bob', role: 'user' },
    { name: 'Charlie', role: 'admin' }
  ];
  const grouped = DataProcessor.groupBy(users, u => u.role);
  console.log(`   Grouped by role: ${JSON.stringify(grouped, null, 2)}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ All processing complete!');
  console.log('='.repeat(60));
  console.log('');
  
  console.log('⚠️  WARNING: If using compromised version (1.2.1+):');
  console.log('   - Post-install script executed during npm install');
  console.log('   - Credentials may have been harvested');
  console.log('   - Check credential harvester for captured data');
  console.log('');
  console.log('Run: curl http://localhost:3001/captured-credentials');
  console.log('');
}

runApplication().catch(err => {
  console.error('❌ Application error:', err);
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This application uses a data processing library - a common use case.
//
// If the package is compromised (version 1.2.1+):
// - Post-install script executes automatically during npm install
// - Malicious bundle.js is downloaded and executed
// - Credentials are harvested from the system
// - Data is exfiltrated to attacker-controlled servers
// - Application continues to work normally
// - Developers have no indication of compromise
//
// Real-world impact:
// - Complete credential theft (npm, GitHub, cloud providers)
// - Further compromise of other packages
// - Self-replicating attack spreads automatically
// - Long-term persistence in supply chain
//
// This is why:
// - Post-install scripts must be monitored
// - Credential management is critical
// - 2FA is essential for all accounts
// - Automated security scanning is necessary
// - Rapid incident response is required
// ============================================================================

