const fs = require('fs');
const path = require('path');

// Simple static check for suspicious strings in Dockerfile
function scanDockerfile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const findings = [];
  if (/curl .*http/i.test(txt) || /wget .*http/i.test(txt)) findings.push('network fetch in Dockerfile');
  if (/host\.docker\.internal/i.test(txt)) findings.push('references host.docker.internal');
  if (/malicious-start\.js/i.test(txt)) findings.push('known malicious entrypoint');
  return findings;
}

if (require.main === module) {
  const target = process.argv[2] || '.';
  const dockerfile = path.join(target, 'Dockerfile');
  if (!fs.existsSync(dockerfile)) {
    console.error('No Dockerfile at', dockerfile);
    process.exit(1);
  }
  const res = scanDockerfile(dockerfile);
  if (res.length) {
    console.log('Potential issues found:');
    res.forEach((r) => console.log('- ' + r));
    process.exit(2);
  }
  console.log('No obvious issues found in Dockerfile.');
}

