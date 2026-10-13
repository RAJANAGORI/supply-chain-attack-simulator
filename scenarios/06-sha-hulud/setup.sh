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
rm -f infrastructure/captured-credentials.json infrastructure/backdoor-prs.json
rm -f infrastructure/published-packages.json infrastructure/repo-logs.json
rm -f infrastructure/ci-audit-trail.json infrastructure/registry-db.json
rm -f infrastructure/network-monitor.json detection-tools/sbom-drift.json

echo "Creating directory structure..."
mkdir -p malicious-packages/shai-hulud
mkdir -p victim-app/packages/victim-utils
mkdir -p victim-app/packages/victim-api
mkdir -p victim-app/packages/victim-logger
mkdir -p victim-app/packages/victim-auth
mkdir -p infrastructure
mkdir -p templates
mkdir -p detection-tools
echo "Directories created"
echo ""

# ---------------------------------------------------------------------------
# Malicious package template — lockfile-aware propagation
# ---------------------------------------------------------------------------
echo "Setting up malicious package template (lockfile-aware propagation)..."

# Copy the enhanced postinstall template (written by scenario authoring)
cp templates/shai-hulud-postinstall.js malicious-packages/shai-hulud/postinstall.js

# Package metadata for shai-hulud
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

echo "Malicious package created (with lockfile-aware propagation)"
echo ""

# ---------------------------------------------------------------------------
# Victim application, workspace, and package-lock.json
# ---------------------------------------------------------------------------
echo "Setting up victim workspace..."

cat > victim-app/package.json << 'EOF'
{
  "name": "victim-workspace",
  "version": "1.0.0",
  "description": "A private workspace that installs shai-hulud and maintains @victim-org/* packages",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "shai-hulud": "file:../malicious-packages/shai-hulud",
    "@victim-org/victim-utils": "file:./packages/victim-utils",
    "@victim-org/victim-api": "file:./packages/victim-api",
    "@victim-org/victim-logger": "file:./packages/victim-logger",
    "@victim-org/victim-auth": "file:./packages/victim-auth"
  },
  "author": "Victim Org",
  "license": "MIT",
  "private": true
}
EOF

cat > victim-app/index.js << 'EOF'
/**
 * VICTIM APPLICATION
 * Installs `shai-hulud` and depends on @victim-org/* internal packages.
 */

const ShaiHulud = require('shai-hulud');
const VictimUtils = require('@victim-org/victim-utils');
const VictimApi = require('@victim-org/victim-api');
const VictimLogger = require('@victim-org/victim-logger');
const VictimAuth = require('@victim-org/victim-auth');

console.log('Starting victim application...');
console.log(ShaiHulud.format('dependency loaded'));
console.log(VictimUtils.greet('developer'));
console.log(VictimUtils.sha256('hello'));
console.log(VictimApi.get('/health'));
console.log(VictimLogger.log('system', 'app started'));
console.log(VictimAuth.protect('admin'));
console.log('If TESTBENCH_MODE is enabled, the postinstall script has already run.');
console.log('Check the credential harvester, mock registry, and GitHub simulator for evidence.');
EOF

cat > victim-app/packages/victim-utils/package.json << 'EOF'
{
  "name": "@victim-org/victim-utils",
  "version": "1.0.0",
  "description": "Internal utilities maintained by the victim team",
  "main": "index.js",
  "author": "Victim Org",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/victim-org/victim-utils"
  },
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
EOF

cat > victim-app/packages/victim-utils/index.js << 'EOF'
/**
 * @victim-org/victim-utils
 * Legitimate internal package maintained by the victim team.
 */

const _ = require('lodash');

module.exports = {
  greet(name) {
    return `Hello, ${name}!`;
  },
  sha256(input) {
    // Simplified SHA-256 for simulation only (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'sha256:' + Math.abs(hash).toString(16).padStart(64, '0');
  },
  deepClone(obj) {
    return _.cloneDeep(obj);
  }
};
EOF

cat > victim-app/packages/victim-api/package.json << 'EOF'
{
  "name": "@victim-org/victim-api",
  "version": "2.1.0",
  "description": "Internal API client maintained by the victim team",
  "main": "index.js",
  "author": "Victim Org",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/victim-org/victim-api"
  },
  "dependencies": {
    "@victim-org/victim-utils": "file:../victim-utils"
  }
}
EOF

cat > victim-app/packages/victim-api/index.js << 'EOF'
const utils = require('@victim-org/victim-utils');

module.exports = {
  get(path) {
    return `GET ${path} → 200 OK (utils: ${utils.greet('api')})`;
  },
  post(path, body) {
    return `POST ${path} → 201 Created (utils: ${utils.sha256(JSON.stringify(body))})`;
  }
};
EOF

cat > victim-app/packages/victim-logger/package.json << 'EOF'
{
  "name": "@victim-org/victim-logger",
  "version": "0.5.2",
  "description": "Structured logging maintained by the victim team",
  "main": "index.js",
  "author": "Victim Org",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/victim-org/victim-logger"
  },
  "dependencies": {
    "@victim-org/victim-utils": "file:../victim-utils"
  }
}
EOF

cat > victim-app/packages/victim-logger/index.js << 'EOF'
const utils = require('@victim-org/victim-utils');

module.exports = {
  log(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level.toUpperCase()}: ${message} (utils hash: ${utils.sha256(message)})`;
  }
};
EOF

cat > victim-app/packages/victim-auth/package.json << 'EOF'
{
  "name": "@victim-org/victim-auth",
  "version": "3.2.1",
  "description": "Authentication middleware maintained by the victim team",
  "main": "index.js",
  "author": "Victim Org",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/victim-org/victim-auth"
  },
  "dependencies": {
    "@victim-org/victim-utils": "file:../victim-utils"
  }
}
EOF

cat > victim-app/packages/victim-auth/index.js << 'EOF'
const utils = require('@victim-org/victim-utils');

module.exports = {
  protect(role) {
    const token = utils.sha256(role + '_token');
    return { role, token };
  }
};
EOF

# package-lock.json is committed. Do not rewrite it here.
# A hand-written "link": true entry whose resolved path is "file:..." with no
# matching packages key makes npm 11 fail install with EMISSINGTARGET.
if [ ! -f victim-app/package-lock.json ]; then
  echo "Missing victim-app/package-lock.json"
  exit 1
fi

echo "Victim workspace created (4 @victim-org/* packages, lockfile left as committed)"
echo ""

# ---------------------------------------------------------------------------
# Local mock infrastructure — enhanced versions
# ---------------------------------------------------------------------------
echo "Setting up enhanced infrastructure components..."

# Initialize log files
echo '{"captures": []}' > infrastructure/captured-credentials.json
echo '{"publishes": []}' > infrastructure/published-packages.json
echo '{"prs": []}' > infrastructure/backdoor-prs.json
echo '{"repos": []}' > infrastructure/repo-logs.json
echo '{"audits": []}' > infrastructure/ci-audit-trail.json
echo '{"events": []}' > infrastructure/network-monitor.json
echo '{"packages": {}}' > infrastructure/registry-db.json

echo "Infrastructure components created (enhanced)"
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
echo "Setup Complete — Enhanced Shai-Hulud Scenario"
echo "================================================"
echo ""
echo "This scenario simulates worm propagation via lockfile resolution."
echo "The postinstall payload parses package-lock.json, targets @victim-org/*"
echo "scoped packages, simulates registry publishes, and opens backdoor PRs."
echo ""
echo "Infrastructure Services:"
echo "  1. node infrastructure/credential-harvester.js &     (port 3001)"
echo "  2. node infrastructure/github-actions-simulator.js & (port 3002)"
echo "  3. node infrastructure/mock-registry.js &            (port 3003)"
echo "  4. node detection-tools/network-monitor.js &         (port 3005)"
echo ""
echo "Victor Workspace: 5 scoped packages (victim-utils, victim-api, victim-logger, victim-auth)"
echo "Lockfile: 4 @victim-org/* targets in package-lock.json"
echo ""
echo "Next steps:"
echo ""
echo "1. Start all mock servers (ports 3001, 3002, 3003, 3005)"
echo ""
echo "2. Install the malicious package:"
echo "   cd victim-app"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm install"
echo ""
echo "3. Inspect attack evidence:"
echo "   curl http://localhost:3001/captured-credentials"
echo "   curl http://localhost:3002/backdoor-prs"
echo "   curl http://localhost:3003/published-packages"
echo "   curl http://localhost:3005/network-log"
echo ""
echo "4. Run detection tools:"
echo "   node detection-tools/credential-scanner.js"
echo "   node detection-tools/postinstall-monitor.js"
echo "   node detection-tools/sbom-drift-check.js"
echo "   node detection-tools/worm-status.js"
echo ""
echo "5. Run the worm propagation simulation:"
echo "   node templates/shai-hulud-postinstall.js"
echo ""
echo "Read the full lab instructions:"
echo "   cat README.md"
echo ""
