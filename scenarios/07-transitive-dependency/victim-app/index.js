/**
 * VICTIM APPLICATION
 * 
 * This application uses 'web-utils' package
 * web-utils depends on 'data-processor' (transitive dependency)
 * 
 * The victim never directly installed 'data-processor'
 * but it gets installed automatically as a dependency of 'web-utils'
 */

console.log('🚀 Starting Victim Application...\n');

const WebUtils = require('web-utils');

console.log('📦 Loaded web-utils package');
console.log('⚠️  Note: web-utils depends on data-processor (transitive dependency)\n');

// Simulate application usage
async function runApplication() {
  console.log('='.repeat(60));
  console.log('Processing User Data');
  console.log('='.repeat(60));
  console.log('');

  // Sample user data
  const users = [
    { name: 'Alice', role: 'admin', active: true },
    { name: 'Bob', role: 'user', active: true },
    { name: 'Charlie', role: 'admin', active: false },
    { name: 'Diana', role: 'user', active: true }
  ];

  // Use web-utils functions
  console.log('1. Grouping users by role:');
  const grouped = WebUtils.processUsers(users);
  console.log(JSON.stringify(grouped, null, 2));
  console.log('');

  console.log('2. Filtering active users:');
  const activeUsers = WebUtils.getActiveUsers(users);
  console.log(JSON.stringify(activeUsers, null, 2));
  console.log('');

  console.log('3. Sorting users by name:');
  const sorted = WebUtils.sortUsersByName(users);
  console.log(JSON.stringify(sorted, null, 2));
  console.log('');

  console.log('4. Total users:');
  const total = WebUtils.getTotalUsers(users);
  console.log(`Total: ${total}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ Application running successfully!');
  console.log('='.repeat(60));
  console.log('');

  console.log('⚠️  IMPORTANT: Check if data-processor was compromised!');
  console.log('   The victim app never directly installed data-processor,');
  console.log('   but it was installed as a dependency of web-utils.');
  console.log('');
  console.log('   Check captured data:');
  console.log('   curl http://localhost:3000/captured-data');
  console.log('');
}

runApplication().catch(err => {
  console.error('❌ Application error:', err);
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates a transitive dependency attack:
//
// 1. Victim installs 'web-utils' (legitimate, trusted package)
// 2. web-utils depends on 'data-processor' (transitive dependency)
// 3. Attacker compromises 'data-processor' and publishes malicious version
// 4. When victim installs web-utils, npm installs compromised data-processor
// 5. Malicious postinstall script executes automatically
// 6. Data is exfiltrated even though victim never directly installed data-processor
//
// Why this is dangerous:
// - Victim doesn't directly control transitive dependencies
// - Hard to detect because victim didn't install the malicious package
// - Affects all packages that depend on the compromised package
// - Can spread through entire dependency tree
//
// Real-world examples:
// - event-stream → flatmap-stream (2018)
// - Multiple npm packages compromised through transitive dependencies
// - Affected React, Vue, Angular projects
// ============================================================================

