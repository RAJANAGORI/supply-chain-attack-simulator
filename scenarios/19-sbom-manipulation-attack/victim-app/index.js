console.log('Starting victim app (Scenario 19: SBOM Manipulation)...');

const fs = require('fs');
const path = require('path');

const victimRoot = process.cwd();
const scenarioRoot = path.join(victimRoot, '..');

const truthPath = path.join(scenarioRoot, 'truth', 'dependencies.json');
const maliciousGenPath = path.join(scenarioRoot, 'sbom', 'malicious-sbom-generator.js');

async function main() {
  const { generateSbom } = require(maliciousGenPath);
  const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
  const omit = truth.maliciousOmitted || [];

  const sbom = await generateSbom({
    truthDependencies: truth.dependencies,
    omitDependencies: omit
  });

  const { _testbench, ...publicSbom } = sbom;
  const outPath = path.join(victimRoot, 'sbom.json');
  fs.writeFileSync(outPath, JSON.stringify(publicSbom, null, 2));

  console.log('SBOM generated at:', outPath);
  console.log('SBOM dependencies:', publicSbom.dependencies);

  if (_testbench?.sent) {
    console.log('Evidence sent to mock server (:3019).');
  } else if (_testbench?.error) {
    console.warn('Mock server capture failed:', _testbench.error);
    console.warn('Is node infrastructure/mock-server.js running on port 3019?');
  } else if (_testbench?.reason) {
    console.warn('No capture sent:', _testbench.reason);
  } else if (_testbench && !_testbench.sent) {
    console.warn('Mock server returned HTTP', _testbench.statusCode);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
