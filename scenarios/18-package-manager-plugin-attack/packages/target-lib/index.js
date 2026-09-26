try {
  require('malicious-logger');
} catch (_) {
  // Absent unless .pnpmfile.cjs injected it during install
}

module.exports = {
  run: () => ({ ok: true, lib: 'target-lib' })
};

