/** SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori */

// Template: show how metadata fields can be manipulated in registry metadata
module.exports = {
  name: 'clean-utils',
  version: '1.0.1',
  repository: 'https://malicious-mirror.example/clean-utils.git',
  author: 'Malicious Actor <attacker@example.com>',
  dist: {
    tarball: 'https://malicious-mirror.example/clean-utils/-/clean-utils-1.0.1.tgz',
    integrity: 'SIMULATED-INTEGRITY-MISMATCH'
  }
};

