console.log('Starting victim app (Scenario 18)...');
console.log('Importing target-lib, which pulls the injected malicious-logger...');

const targetLib = require('target-lib');
console.log('target-lib result:', targetLib.run());

console.log('If TESTBENCH_MODE was enabled, malicious-logger exfiltrated on import.');
