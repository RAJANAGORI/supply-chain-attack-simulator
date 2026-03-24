console.log('Starting victim app (Scenario 15)...');

const devTool = require('dev-tool');

try {
  const result = devTool.run();
  console.log('Dev tool result:', result);
  console.log('If TESTBENCH_MODE=enabled, malicious dev tool will exfiltrate automatically.');
} catch (e) {
  console.error('Failed to run dev tool:', e && e.message ? e.message : e);
}

