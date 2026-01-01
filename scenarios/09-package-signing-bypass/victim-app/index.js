/**
 * VICTIM APPLICATION
 * 
 * This application uses secure-utils, a signed package.
 * The package signature verification PASSES, but the signing keys
 * have been compromised, so the malicious package appears legitimate.
 */

console.log('🚀 Starting Victim Application...\n');

const SecureUtils = require('secure-utils');

console.log('📦 Loaded secure-utils package');
console.log('✅ Signature verification: PASSED');
console.log('✅ Key fingerprint: Verified\n');

// Use the library
console.log('='.repeat(60));
console.log('Using Secure Utils');
console.log('='.repeat(60));
console.log('');

// Hash data
const data = 'sensitive data';
const hash = SecureUtils.hash(data);
console.log('1. Hashing data:');
console.log(`   Input: ${data}`);
console.log(`   Hash: ${hash.substring(0, 32)}...`);
console.log('');

// Validate email
const email = 'user@example.com';
const isValid = SecureUtils.validate(email, 'email');
console.log('2. Validating email:');
console.log(`   Email: ${email}`);
console.log(`   Valid: ${isValid}`);
console.log('');

// Encrypt data
const secret = 'my secret';
const key = 'encryption-key';
const encrypted = SecureUtils.encrypt(secret, key);
console.log('3. Encrypting data:');
console.log(`   Encrypted: ${encrypted.substring(0, 32)}...`);
console.log('');

console.log('='.repeat(60));
console.log('✅ Application running successfully!');
console.log('='.repeat(60));
console.log('');

console.log('⚠️  IMPORTANT: Check signature verification status!');
console.log('   The package signature VERIFIES as valid,');
console.log('   but the signing keys have been COMPROMISED.');
console.log('');
console.log('   Check captured data:');
console.log('   curl http://localhost:3000/captured-data');
console.log('');

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates package signing bypass:
//
// 1. Package signature verification PASSES
// 2. Key fingerprint matches expected values
// 3. Signature appears legitimate
// 4. BUT the signing keys have been COMPROMISED
// 5. Attacker is using legitimate keys to sign malicious packages
// 6. Signature verification cannot detect this attack
//
// Why this is dangerous:
// - Signature verification passes (package appears legitimate)
// - Users trust signed packages completely
// - Hard to detect without behavioral analysis
// - Compromised keys can sign many malicious packages
//
// Real-world examples:
// - SolarWinds: Code signing certificates compromised
// - npm packages: Maintainer signing keys compromised
// - Detection time: Often weeks or months
//
// Detection methods:
// - Behavioral analysis (unusual package behavior)
// - Key compromise detection (monitoring key usage)
// - Timestamp analysis (unusual signing times)
// - Code review (malicious code despite valid signature)
// ============================================================================

