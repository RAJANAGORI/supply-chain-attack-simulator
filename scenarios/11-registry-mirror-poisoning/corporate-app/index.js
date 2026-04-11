/**
 * ENTERPRISECORP WEB APPLICATION
 * Internal corporate application using packages from mirror
 */

console.log('🏢 Starting EnterpriseCorp Web Application...\n');

// Import packages (expecting legitimate versions from mirror)
const EnterpriseUtils = require('enterprise-utils');
const SecureLib = require('secure-lib');

console.log('📦 Loaded dependencies from internal mirror:');
console.log('  - enterprise-utils');
console.log('  - secure-lib');
console.log('');

// Initialize application
async function startApplication() {
  try {
    console.log('🔧 Initializing enterprise utilities...');
    const formatted = EnterpriseUtils.formatData({ 
      app: 'EnterpriseCorp Web App',
      version: '1.0.0'
    });
    console.log('✅ Enterprise utilities initialized');
    console.log(`   Formatted data: ${formatted.substring(0, 50)}...`);
    
    console.log('');
    console.log('🔐 Initializing secure library...');
    const encrypted = SecureLib.encrypt('sensitive-data-12345');
    console.log('✅ Secure library initialized');
    console.log(`   Encrypted data: ${encrypted.substring(0, 30)}...`);
    
    console.log('');
    console.log('✅ Application started successfully!');
    console.log('🌍 Server running on http://localhost:8080');
    console.log('');
    
    console.log('='.repeat(60));
    console.log('⚠️  CHECK YOUR MOCK SERVER FOR EXFILTRATED DATA');
    console.log('='.repeat(60));
    console.log('');
    console.log('If mirror poisoning was successful, sensitive data');
    console.log('may have been sent to the attacker\'s server.');
    console.log('');
    console.log('Run: curl http://localhost:3000/captured-data');
    console.log('');
    
  } catch (error) {
    console.error('❌ Application failed to start:', error.message);
    process.exit(1);
  }
}

startApplication();

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This application uses packages from an internal registry mirror.
//
// If mirror poisoning is successful:
// 1. Mirror serves malicious packages instead of legitimate ones
// 2. Developers install packages from compromised mirror
// 3. Malicious postinstall scripts execute
// 4. Sensitive data (API keys, configs) are exfiltrated
// 5. Application still works (malicious packages provide functionality)
// 6. Developers won't notice anything wrong
//
// Real-world impact:
// - All internal developers affected
// - Complete compromise of internal systems
// - Credential theft
// - Backdoor installation
// - Supply chain compromise
// ============================================================================
