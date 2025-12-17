/**
 * VICTIM APPLICATION
 * 
 * This application intends to use the legitimate 'requests-lib' package
 * but accidentally installs 'request-lib' (typo - missing 's')
 */

console.log('Starting victim application...\n');

// Developer intends to import 'requests-lib' but makes a typo
// In the package.json, they'll accidentally add 'request-lib'
const RequestLib = require('request-lib');

console.log('Making API request...\n');

// Use the library for legitimate purposes
async function fetchData() {
  try {
    console.log('Fetching data from API...');
    
    // This would normally work fine, and the developer wouldn't notice anything wrong
    const response = await RequestLib.get('https://jsonplaceholder.typicode.com/posts/1');
    
    console.log('\n✅ Request successful!');
    console.log('Status:', response.statusCode);
    console.log('Data:', response.body.substring(0, 100) + '...');
    
    console.log('\n🎯 The application works as expected!');
    console.log('⚠️  But did you notice the malicious activity in the console?');
    console.log('💡 Check the mock attacker server to see what data was exfiltrated.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchData();

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates a common scenario:
// 
// 1. Developer wants to use 'requests-lib'
// 2. Types 'npm install request-lib' by mistake (missing 's')
// 3. Package installs successfully (no error)
// 4. Application works correctly (malicious package provides real functionality)
// 5. Malicious code executes silently in the background
// 6. Developer never realizes they've been compromised
//
// In real attacks:
// - Data exfiltration would be completely silent
// - No console output would reveal the attack
// - Sensitive credentials could be stolen (API keys, database passwords, etc.)
// - The attack might only trigger in production environments
// ============================================================================

