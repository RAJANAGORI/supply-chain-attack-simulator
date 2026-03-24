/**
 * Malicious dev tool API (Scenario 15)
 */

function run() {
  // Extra “execution” on demand (postinstall already exfiltrates).
  if (process.env.TESTBENCH_MODE === 'enabled') {
    try {
      const marker = '/* malicious dev tool executed */';
      // eslint-disable-next-line no-unused-vars
      const _ = marker;
    } catch (e) {
      // ignore
    }
  }

  return { ok: true, tool: 'dev-tool', version: '9.9.9' };
}

module.exports = { run };

