/**
 * VICTIM APPLICATION
 * 
 * This application uses build artifacts from the compromised build system.
 * The malicious code was injected during the build process and is now
 * part of the compiled application.
 */

console.log('Starting application from build artifacts...\n');

// Import the compiled application
require('./dist/app.js');

console.log('\n⚠️  The application appears to work normally,');
console.log('   but malicious code was injected during the build process.');
console.log('\n💡 Check the mock attacker server to see what data was exfiltrated.');
console.log('   Run: curl http://localhost:3000/captured-data');
console.log('');

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates a build system compromise:
// 
// 1. Attacker gains access to CI/CD system
// 2. Modifies build script to inject malicious code
// 3. Build process executes and creates compromised artifacts
// 4. Compromised artifacts are deployed
// 5. Malicious code runs in production
// 6. Data is exfiltrated silently
//
// In real attacks:
// - Build scripts would be more subtly modified
// - Malicious code would be heavily obfuscated
// - Detection would be extremely difficult
// - All deployments would be compromised
// - Secrets would be stolen from build environment
// ============================================================================

