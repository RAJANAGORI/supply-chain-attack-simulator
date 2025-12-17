/**
 * VICTIM APPLICATION
 * Uses secure-validator package (now compromised)
 */

console.log('🚀 Starting Application with secure-validator...\n');

// Import the validator (could be compromised version)
const SecureValidator = require('secure-validator');

console.log('📦 Loaded secure-validator package\n');

// Simulate typical application usage
async function runApplication() {
  console.log('='  .repeat(60));
  console.log('Testing Input Validation');
  console.log('='.repeat(60));
  console.log('');

  // Test email validation
  console.log('1. Validating email addresses:');
  const email1 = 'user@example.com';
  const emailResult = SecureValidator.validateEmail(email1);
  console.log(`   Email: ${email1} - Valid: ${emailResult}`);
  
  const email2 = 'admin@company-internal.com';
  const emailResult2 = SecureValidator.validateEmail(email2);
  console.log(`   Email: ${email2} - Valid: ${emailResult2}`);
  console.log('');

  // Test URL validation
  console.log('2. Validating URLs:');
  const url1 = 'https://api.internal.company.com/v1/users';
  const urlResult = SecureValidator.validateUrl(url1);
  console.log(`   URL: ${url1} - Valid: ${urlResult}`);
  console.log('');

  // Test password validation
  console.log('3. Validating passwords:');
  const password1 = 'SuperSecret123!';
  const pwdResult = SecureValidator.validatePassword(password1);
  console.log(`   Password strength: ${pwdResult.strength} (score: ${pwdResult.score})`);
  
  const password2 = 'AdminPass2024#';
  const pwdResult2 = SecureValidator.validatePassword(password2);
  console.log(`   Password strength: ${pwdResult2.strength} (score: ${pwdResult2.score})`);
  console.log('');

  // Test input sanitization
  console.log('4. Sanitizing user input:');
  const userInput = '<script>alert("XSS")</script>';
  const sanitized = SecureValidator.sanitizeHtml(userInput);
  console.log(`   Original: ${userInput}`);
  console.log(`   Sanitized: ${sanitized}`);
  console.log('');

  // Test with sensitive data (API keys in input)
  console.log('5. Validating complex input:');
  const apiKey = 'sk_live_1234567890abcdef';
  const inputResult = SecureValidator.validateInput(apiKey, 'string');
  console.log(`   API Key validation: ${inputResult.valid ? 'Valid' : 'Invalid'}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ All validations complete!');
  console.log('='.repeat(60));
  console.log('');
  
  console.log('⚠️  WARNING: If using compromised version (2.5.4+):');
  console.log('   - All validated data was exfiltrated');
  console.log('   - Including: emails, URLs, passwords, API keys');
  console.log('   - Check mock server for captured data');
  console.log('');
  console.log('Run: curl http://localhost:3000/captured-data');
  console.log('');
}

runApplication().catch(err => {
  console.error('❌ Application error:', err);
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This application uses a validation library - a common use case.
//
// If the package is compromised (version 2.5.4+):
// - All validated data is captured and exfiltrated
// - Passwords are stolen in plain text
// - Internal URLs are revealed
// - API keys are compromised
// - Application continues to work normally
// - Developers have no indication of compromise
//
// Real-world impact of compromised validation libraries:
// - Complete credential theft
// - Exposure of internal infrastructure
// - API key compromise
// - User data breach
// - Regulatory violations (GDPR, HIPAA, etc.)
//
// This is why:
// - Package lock files are critical
// - Automated security scanning is essential
// - Runtime monitoring is necessary
// - Regular security audits are required
// ============================================================================

