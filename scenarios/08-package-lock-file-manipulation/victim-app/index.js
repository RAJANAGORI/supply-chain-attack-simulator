/**
 * VICTIM APPLICATION
 *
 * package.json may look fine while package-lock.json / file: deps pull evil-utils.
 * Do NOT bind :3000 — that port is the mock collector for this lab (and labs 01-12).
 */

const _ = require('lodash');

console.log('🚀 Starting Victim Application...\n');

const data = [1, 2, 3, 4, 5];
const doubled = _.map(data, (x) => x * 2);
console.log('lodash map demo:', doubled.join(', '));
console.log('📦 Expected deps: express, lodash');
console.log('');

let evilUtilsInstalled = false;
try {
  require('evil-utils');
  evilUtilsInstalled = true;
} catch (_) {
  // not installed
}

if (evilUtilsInstalled) {
  console.log('⚠️  WARNING: evil-utils package detected!');
  console.log('   This package may be absent from a clean package.json review');
  console.log('   and was pulled via lockfile / file: dependency manipulation.');
  console.log('');
} else {
  console.log('✅ No malicious packages detected in require()');
  console.log('');
}

console.log('Check captured data (mock collector, keep it running):');
console.log('  curl http://localhost:3000/captured-data');
console.log('');
console.log('✅ Victim check finished (no long-lived server — avoids EADDRINUSE on :3000)');

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// 1. Lockfile / file: deps can install packages reviewers miss in package.json
// 2. npm install runs postinstall on evil-utils when TESTBENCH_MODE is enabled
// 3. Exfil goes to the mock on localhost:3000 — keep that mock up for the inspector
// ============================================================================
