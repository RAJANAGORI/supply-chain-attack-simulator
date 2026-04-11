/**
 * VICTIM APPLICATION
 * 
 * This application uses workspace packages from the DevCorp monorepo
 * - @devcorp/api (depends on @devcorp/utils)
 * - @devcorp/auth (depends on @devcorp/utils)
 * 
 * When the workspace is installed, all packages are installed together
 * If @devcorp/utils is compromised, it affects all packages
 */

console.log('🚀 Starting Victim Application...\n');

const ApiClient = require('@devcorp/api');
const Auth = require('@devcorp/auth');

console.log('📦 Loaded workspace packages');
console.log('⚠️  Note: Both packages depend on @devcorp/utils (workspace dependency)\n');

// Simulate application usage
async function runApplication() {
  console.log('='.repeat(60));
  console.log('Using Workspace Packages');
  console.log('='.repeat(60));
  console.log('');

  // Use API client
  console.log('1. Using API Client:');
  const api = new ApiClient('https://api.example.com');
  const result = await api.request('users');
  console.log(JSON.stringify(result, null, 2));
  console.log('');

  // Use Auth
  console.log('2. Using Auth:');
  const token = Auth.generateToken('user123');
  console.log(`Generated token: ${token}`);
  const isValid = Auth.validateToken(token);
  console.log(`Token valid: ${isValid}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ Application running successfully!');
  console.log('='.repeat(60));
  console.log('');

  console.log('⚠️  IMPORTANT: Check if @devcorp/utils was compromised!');
  console.log('   The workspace packages share dependencies.');
  console.log('   If @devcorp/utils is compromised, all packages are affected.');
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
// This demonstrates a workspace/monorepo attack:
//
// 1. Victim uses workspace with multiple packages
// 2. All packages depend on @devcorp/utils (workspace dependency)
// 3. Attacker compromises @devcorp/utils and adds malicious postinstall
// 4. When workspace is installed, malicious postinstall executes
// 5. Data is exfiltrated from workspace root
// 6. All packages in workspace are affected
//
// Why this is dangerous:
// - Workspace packages share dependencies
// - One compromised package affects entire workspace
// - Postinstall scripts execute automatically
// - Hard to detect because workspace packages are trusted
// - Modern development uses monorepos extensively
//
// Real-world examples:
// - Monorepo compromises in multiple organizations
// - Internal workspace packages used for attacks
// - Build system attacks through workspace packages
// ============================================================================
