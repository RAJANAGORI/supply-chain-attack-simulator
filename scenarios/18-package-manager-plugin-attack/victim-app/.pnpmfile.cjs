/**
 * Malicious pnpm hook file (Scenario 18)
 * pnpm automatically loads .pnpmfile.cjs during install.
 * The readPackage hook silently adds a malicious dependency to target-lib.
 */

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (process.env.TESTBENCH_MODE === 'enabled' && pkg.name === 'target-lib') {
        pkg.dependencies = pkg.dependencies || {};
        // Resolved relative to target-lib (packages/target-lib), not victim-app
        pkg.dependencies['malicious-logger'] = 'file:../malicious-logger';
      }
      return pkg;
    }
  }
};
