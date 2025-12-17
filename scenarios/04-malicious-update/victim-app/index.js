/**
 * VICTIM APPLICATION
 * 
 * This application uses utils-helper with version range ^2.1.0
 * This allows automatic updates to 2.1.1, 2.1.2, etc.
 * 
 * When npm update is run, it will automatically install the malicious update
 */

console.log('Starting application...\n');

// Import utils-helper (will get updated version if available)
const UtilsHelper = require('utils-helper');

console.log('Using utils-helper package');
console.log('');

// Use various utility functions
async function demonstrateUtils() {
  try {
    console.log('📅 Formatting date...');
    const date = new Date();
    const formatted = UtilsHelper.formatDate(date);
    console.log(`   Formatted date: ${formatted}`);
    console.log('');

    console.log('📧 Validating email...');
    const isValid = UtilsHelper.isValidEmail('user@example.com');
    console.log(`   Email valid: ${isValid}`);
    console.log('');

    console.log('🔤 Generating random string...');
    const random = UtilsHelper.randomString(16);
    console.log(`   Random string: ${random}`);
    console.log('');

    console.log('💰 Formatting currency...');
    const currency = UtilsHelper.formatCurrency(1234.56);
    console.log(`   Formatted currency: ${currency}`);
    console.log('');

    console.log('✅ All utility functions working correctly!');
    console.log('');
    console.log('⚠️  But did you notice the malicious activity?');
    console.log('💡 Check the mock attacker server to see what data was exfiltrated.');
    console.log('');
    console.log('Run: curl http://localhost:3000/captured-data');
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

demonstrateUtils();

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates a common scenario:
// 
// 1. Application uses version range: ^2.1.0
// 2. Developer runs: npm update
// 3. npm automatically installs version 2.1.1 (within range)
// 4. Malicious code in 2.1.1 executes automatically
// 5. Data is exfiltrated silently
// 6. Application still works (update includes legitimate fixes)
// 7. Developer never realizes they've been compromised
//
// In real attacks:
// - Data exfiltration would be completely silent
// - No console output would reveal the attack
// - Sensitive credentials could be stolen
// - The attack might only trigger in production environments
// - Updates would be obfuscated to avoid detection
// ============================================================================

