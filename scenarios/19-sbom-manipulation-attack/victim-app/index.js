console.log('Starting victim app (Scenario 19: SBOM Manipulation)...');

const fs = require('fs');
const path = require('path');

const victimRoot = process.cwd();
const scenarioRoot = path.join(victimRoot, '..');

const truthPath = path.join(scenarioRoot, 'truth', 'dependencies.json');
const maliciousGenPath = path.join(scenarioRoot, 'sbom', 'malicious-sbom-generator.js');

const { generateSbom } = require(maliciousGenPath);
const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'));

const omit = truth.maliciousOmitted || [];

const sbom = generateSbom({
  truthDependencies: truth.dependencies,
  omitDependencies: omit
});

const outPath = path.join(victimRoot, 'sbom.json');
fs.writeFileSync(outPath, JSON.stringify(sbom, null, 2));

console.log('SBOM generated at:', outPath);
console.log('SBOM dependencies:', sbom.dependencies);

