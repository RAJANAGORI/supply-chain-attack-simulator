/**
 * VICTIM APPLICATION
 * 
 * This application uses the compromised repository.
 * When the repository is cloned or submodules are initialized,
 * the malicious submodule executes automatically.
 */

console.log('🚀 Starting Victim Application...\n');

console.log('⚠️  WARNING: This app uses a compromised repository');
console.log('   The repository contains a malicious git submodule');
console.log('');
console.log('   The submodule executes automatically when:');
console.log('   - Repository is cloned');
console.log('   - git submodule update is run');
console.log('   - npm install runs (if postinstall hook triggers submodule)');
console.log('');
console.log('   Check captured data:');
console.log('   curl http://localhost:3000/captured-data');
console.log('');

