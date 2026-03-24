/**
 * Simulated package manager install runner (Scenario 18)
 * Calls a plugin hook that can inject/modify target packages.
 */

const fs = require('fs');
const path = require('path');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, dstPath);
    else fs.copyFileSync(srcPath, dstPath);
  });
}

module.exports = async function runPluginInstall({ projectRoot, plugin }) {
  const scenarioRoot = path.join(projectRoot, '..');
  const targetPkgSrc = path.join(scenarioRoot, 'packages', 'target-lib');
  const nodeModules = path.join(projectRoot, 'node_modules');
  const targetPkgDst = path.join(nodeModules, 'target-lib');

  if (!fs.existsSync(targetPkgDst)) {
    copyDir(targetPkgSrc, targetPkgDst);
  }

  if (plugin && typeof plugin.installHook === 'function') {
    // Await to ensure the exfil request has time to land before the victim exits.
    await plugin.installHook({ projectRoot });
  }

  // Load target package after plugin hook runs (to reflect injection impact)
  require('target-lib');
};

