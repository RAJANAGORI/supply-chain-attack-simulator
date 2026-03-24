console.log('Starting victim app (Scenario 18)...');
console.log('Running plugin installation simulation...');

const path = require('path');
const projectRoot = process.cwd();

const hook = require('./plugin-active');
const plugin = require(hook);
const installer = require('./scripts/run-plugin-install');

installer({ projectRoot, plugin }).then(() => {
  console.log('Plugin simulation completed.');
});

