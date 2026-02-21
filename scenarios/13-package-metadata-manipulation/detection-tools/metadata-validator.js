const fs = require('fs');
const path = require('path');

function validatePackageMetadata(pkgPath, expected) {
  if (!fs.existsSync(pkgPath)) return { ok: false, reason: 'missing package.json' };
  const pkg = JSON.parse(fs.readFileSync(pkgPath));
  const issues = [];
  if (expected.repository && pkg.repository && pkg.repository.url !== expected.repository) {
    issues.push(`repository mismatch: expected ${expected.repository} got ${pkg.repository.url}`);
  }
  if (expected.author && pkg.author && pkg.author !== expected.author) {
    issues.push(`author mismatch: expected ${expected.author} got ${pkg.author}`);
  }
  // Simulated integrity check: look for "integrity" field mismatch
  if (expected.integrity && pkg.dist && pkg.dist.integrity && pkg.dist.integrity !== expected.integrity) {
    issues.push('tarball integrity mismatch');
  }
  return { ok: issues.length === 0, issues };
}

if (require.main === module) {
  const target = process.argv[2] || '.';
  const pkgPath = path.join(target, 'package.json');
  const expected = {
    repository: 'https://github.com/example/clean-utils.git',
    author: 'Clean Maintainers <maintainers@example.com>',
    integrity: 'SIMULATED-INTEGRITY-1'
  };
  const res = validatePackageMetadata(pkgPath, expected);
  if (!res.ok) {
    console.log('Metadata issues detected:');
    res.issues.forEach((i) => console.log('- ' + i));
    process.exit(2);
  }
  console.log('No metadata issues found.');
}

