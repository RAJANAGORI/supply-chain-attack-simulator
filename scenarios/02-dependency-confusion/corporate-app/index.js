/**
 * TECHCORP WEB APPLICATION
 * Internal corporate application using private packages
 */

console.log('🏢 Starting TechCorp Web Application...\n');

// Import internal packages (expecting private versions)
const AuthLib = require('@techcorp/auth-lib');
const DataUtils = require('@techcorp/data-utils');
const ApiClient = require('@techcorp/api-client');

console.log('📦 Loaded dependencies:');
console.log('  - @techcorp/auth-lib');
console.log('  - @techcorp/data-utils');
console.log('  - @techcorp/api-client');
console.log('');

// Initialize application
async function startApplication() {
  try {
    console.log('🔐 Initializing authentication...');
    const auth = AuthLib.init({
      apiKey: 'internal-api-key-12345',  // In real app, from env vars
      secretKey: 'super-secret-key'
    });
    console.log('✅ Authentication initialized');
    
    console.log('');
    console.log('📊 Initializing data utilities...');
    const dataService = DataUtils.createService({
      dbConnection: 'mongodb://internal-db:27017/techcorp',
      redisCache: 'redis://internal-cache:6379'
    });
    console.log('✅ Data utilities initialized');
    
    console.log('');
    console.log('🌐 Initializing API client...');
    const api = ApiClient.create({
      baseUrl: 'https://api.techcorp.internal',
      token: 'bearer-token-xyz'
    });
    console.log('✅ API client initialized');
    
    console.log('');
    console.log('✅ Application started successfully!');
    console.log('🌍 Server running on http://localhost:8080');
    console.log('');
    
    // Simulate application work
    console.log('💼 Processing internal business logic...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('');
    console.log('=' .repeat(60));
    console.log('⚠️  CHECK YOUR MOCK SERVER FOR EXFILTRATED DATA');
    console.log('=' .repeat(60));
    console.log('');
    console.log('If dependency confusion was successful, sensitive data');
    console.log('(API keys, database connections, etc.) may have been sent');
    console.log('to the attacker\'s server.');
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
// This application expects to use PRIVATE versions of @techcorp/* packages
//
// If dependency confusion is successful:
// 1. npm will find a higher version on the PUBLIC registry
// 2. The malicious package will be installed instead
// 3. Sensitive configuration (API keys, DB connections) are passed to the packages
// 4. Malicious code can exfiltrate this data
// 5. Application still works (malicious package provides functionality)
// 6. Developers won't notice anything wrong
//
// Real-world impact:
// - Complete compromise of internal systems
// - Credential theft
// - Backdoor installation
// - Data exfiltration
// - Supply chain compromise of customers
// ============================================================================

