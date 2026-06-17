'use strict';

/** Canonical mitigation bullets per scenario (01–22). Single source for README, DETECT, zero-to-hero. */
const PLAYBOOKS = {
  '01': {
    scenarioDir: '01-typosquatting',
    bullets: [
      'Commit `package-lock.json` and use `npm ci` in production pipelines.',
      'Configure registry scope restrictions and verify package signatures where supported.',
      'Run automated dependency scanning (e.g. `npm audit`, Snyk, Socket.dev).',
      'Require a code-review checklist for every new dependency (name, maintainer, reputation).',
      'Prefer private registries and scope-based routing for internal package names.',
    ],
  },
  '02': {
    scenarioDir: '02-dependency-confusion',
    bullets: [
      'Configure scope-specific registry routing in `.npmrc` (e.g. `@org:registry=...`).',
      'Enforce package lock files and use `npm ci --audit` in CI/CD.',
      'Isolate private registry traffic from public npm at the network layer.',
      'Reserve internal namespaces on public registries where applicable.',
      'Pin dependencies to exact versions for critical packages.',
      'Verify package integrity hashes on install.',
      'Add build-time validation to reject unexpected registry sources.',
    ],
  },
  '03': {
    scenarioDir: '03-compromised-package',
    bullets: [
      'Enforce lockfiles in CI (`npm ci --audit`) instead of open-ended `npm install`.',
      'Pin exact versions for packages with high trust or wide blast radius.',
      'Run automated security scanning on dependency updates (`npm audit`, custom scanners).',
      'Verify package integrity and signatures when the registry supports them.',
      'Monitor runtime behavior and log package installation events in production.',
      'Maintain maintainer-transfer and dependency-addition review policies.',
    ],
  },
  '04': {
    scenarioDir: '04-malicious-update',
    bullets: [
      'Pin exact versions in `package.json` — avoid carets on sensitive dependencies.',
      'Commit lockfiles and use `npm ci` in CI/CD pipelines.',
      'Verify updates before install (changelog review, integrity checks, code diff).',
      'Scan dependency updates automatically in CI before merge.',
      'Use staged rollouts — test updates in staging before production.',
      'Require human review of changelogs for patch and minor bumps on critical packages.',
    ],
  },
  '05': {
    scenarioDir: '05-build-compromise',
    bullets: [
      'Verify build script integrity with checksums before each build.',
      'Apply least privilege to CI/CD jobs and secret exposure.',
      'Run builds in isolated environments with minimal credentials.',
      'Verify build artifacts with checksums and signed attestations.',
      'Use secret management tools — never hardcode secrets in build scripts.',
      'Audit and log all build activities for forensic review.',
      'Sign release artifacts and verify signatures before deployment.',
    ],
  },
  '06': {
    scenarioDir: '06-sha-hulud',
    bullets: [
      'Require 2FA on all package maintainer and publishing accounts.',
      'Restrict or monitor `postinstall` and other lifecycle scripts.',
      'Run automated security scanning in CI on every dependency change.',
      'Use secret management tools; never commit tokens or keys to repositories.',
      'Enforce lockfiles with `npm ci --audit` in CI pipelines.',
      'Rotate credentials immediately after suspected compromise.',
    ],
  },
  '07': {
    scenarioDir: '07-transitive-dependency',
    bullets: [
      'Pin exact dependency versions — avoid loose semver ranges on critical packages.',
      'Commit `package-lock.json` and use `npm ci` in CI/CD.',
      'Run automated scanning (`npm audit`, SBOM tools) across the full dependency tree.',
      'Generate and maintain SBOMs for transitive dependency visibility.',
      'Monitor postinstall script execution and unexpected network requests.',
      'Review the full dependency tree regularly, not only direct dependencies.',
    ],
  },
  '08': {
    scenarioDir: '08-package-lock-file-manipulation',
    bullets: [
      'Validate lockfiles before install in CI and locally.',
      'Use git pre-commit hooks to detect unexpected lockfile changes.',
      'Require careful code review of every `package-lock.json` diff.',
      'Store and verify lockfile checksums as part of release gates.',
      'Compare `package.json` declared deps against lockfile entries automatically.',
      'Verify package integrity hashes match trusted registry metadata.',
    ],
  },
  '09': {
    scenarioDir: '09-package-signing-bypass',
    bullets: [
      'Protect signing keys with HSMs or hardened secret stores.',
      'Require MFA for all key access and signing operations.',
      'Rotate signing keys on a regular schedule and after incidents.',
      'Limit who can sign packages with strict access controls.',
      'Always verify signatures — but pair with behavioral and content analysis.',
      'Monitor signing activity for anomalies (time, volume, key fingerprint).',
    ],
  },
  '10': {
    scenarioDir: '10-git-submodule-attack',
    bullets: [
      'Review every submodule addition in pull requests.',
      'Validate submodule repository URLs against an allowlist.',
      'Limit who can add or modify submodules in protected branches.',
      'Pin submodules to specific commits, not floating branch heads.',
      'Scan submodule content and monitor submodule initialization behavior.',
    ],
  },
  '11': {
    scenarioDir: '11-registry-mirror-poisoning',
    bullets: [
      'Secure mirror access — limit who can publish or modify mirror storage.',
      'Audit mirror configuration and cached packages on a schedule.',
      'Verify mirror packages match upstream registry digests.',
      'Implement strict access controls and MFA on mirror admin paths.',
      'Monitor mirror behavior and alert on unexpected package mutations.',
    ],
  },
  '12': {
    scenarioDir: '12-workspace-monorepo-attack',
    bullets: [
      'Limit who can modify workspace and monorepo internal packages.',
      'Audit all workspace packages regularly for lifecycle scripts and drift.',
      'Monitor postinstall execution across workspace packages.',
      'Review workspace dependency changes with the same rigor as external deps.',
      'Track workspace package changes in version control with mandatory review.',
    ],
  },
  '13': {
    scenarioDir: '13-package-metadata-manipulation',
    bullets: [
      'Validate metadata against trusted allowlists for critical packages.',
      'Require lockfile and integrity verification in CI.',
      'Pin exact versions for sensitive dependencies.',
      'Mirror and sign internal-approved artifacts.',
    ],
  },
  '14': {
    scenarioDir: '14-container-image-supply-chain-attack',
    bullets: [
      'Enforce image provenance and signature verification in CI/CD.',
      'Pin immutable image digests (not mutable tags only).',
      'Add policy checks for entrypoint/CMD changes on critical images.',
      'Restrict outbound network from build and runtime where possible.',
      'Require reproducible image builds and signed attestations.',
    ],
  },
  '15': {
    scenarioDir: '15-developer-tool-compromise',
    bullets: [
      'Enforce `--ignore-scripts` for untrusted tool installs by default.',
      'Pin dev tooling versions and source from an approved internal registry.',
      'Require review/allowlist for new lifecycle scripts in dependency diffs.',
      'Isolate tool installation to sandboxed CI runners with egress controls.',
      'Rotate credentials after any install-time compromise.',
    ],
  },
  '16': {
    scenarioDir: '16-package-cache-poisoning',
    bullets: [
      'Clear/rotate package cache during incident response and critical pipeline runs.',
      'Enforce lockfile + integrity verification against trusted metadata.',
      'Use deterministic installs in CI (`npm ci`) and immutable artifact mirrors.',
      'Monitor for suspicious cache path mutations and postinstall behavior.',
      'Separate developer cache trust from production build trust boundaries.',
    ],
  },
  '17': {
    scenarioDir: '17-multi-stage-attack-chain',
    bullets: [
      'Add correlation rules that require cross-stage context before closing alerts.',
      'Segment credentials and permissions to block stage progression.',
      'Trigger automated containment when stage transitions occur in short windows.',
      'Preserve forensic artifacts per stage for post-incident timeline reconstruction.',
      'Run attack-chain tabletop exercises against your CI/CD architecture.',
    ],
  },
  '18': {
    scenarioDir: '18-package-manager-plugin-attack',
    bullets: [
      'Enforce plugin allowlists with signed/approved plugin sources.',
      'Block arbitrary plugin execution in CI and controlled developer images.',
      'Run integrity checks on `node_modules` and generated lockfile state.',
      'Review plugin code changes with the same rigor as build scripts.',
      'Alert on hook-driven modifications outside expected paths.',
    ],
  },
  '19': {
    scenarioDir: '19-sbom-manipulation-attack',
    bullets: [
      'Regenerate SBOM from lockfile/build artifacts in trusted CI only.',
      'Require SBOM signing and provenance attestation.',
      'Enforce fail-closed CI policy for SBOM-lockfile mismatches.',
      'Keep truth-source and SBOM generation isolated from app code tampering.',
      'Periodically diff production SBOM against runtime inventory scans.',
    ],
  },
  '20': {
    scenarioDir: '20-package-version-confusion',
    bullets: [
      'Pin exact versions for critical dependencies and enforce lockfile usage.',
      'Scope private packages explicitly to internal registry endpoints.',
      'Alert on unusual semver jumps and first-seen maintainers.',
      'Require human review for dependency version changes above policy thresholds.',
      'Prefer deterministic `npm ci` workflows in CI.',
    ],
  },
  '21': {
    scenarioDir: '21-axios-compromised-release-attack',
    bullets: [
      'Contain: stop CI runners and isolate hosts that installed the bad version.',
      'Eradicate: remove `node_modules`, regenerate lockfiles, rotate npm tokens and CI secrets.',
      'Recover: pin to a known-good exact version; enforce lockfile-only installs in CI.',
      'Hunt: search org lockfiles for unexpected transitive packages from advisories.',
      'Enable trusted publishing / provenance checks and lifecycle script monitoring.',
    ],
  },
  '22': {
    scenarioDir: '22-litellm-pypi-compromise',
    bullets: [
      'Contain: stop workloads using the compromised virtualenv; block egress from CI if needed.',
      'Eradicate: `pip uninstall`, delete `.venv`, remove rogue `*.pth` under `site-packages`.',
      'Recover: pin known-good version (`litellm_like==1.82.6`); enforce hash pinning or vetting.',
      'Rotate: API keys and PyPI maintainer tokens after confirmed incidents.',
      'Scan `site-packages/*.pth` in CI after every `pip install`.',
    ],
  },
};

function playbookBullets(id) {
  const entry = PLAYBOOKS[id];
  if (!entry) throw new Error(`Unknown scenario id: ${id}`);
  return entry.bullets;
}

function readmePath(id) {
  return `scenarios/${PLAYBOOKS[id].scenarioDir}/README.md`;
}

function formatBulletList(bullets) {
  return bullets.map((b) => `- ${b}`).join('\n');
}

function formatReadmePlaybook(bullets) {
  return ['## Mitigation Playbook', '', formatBulletList(bullets), '', ''].join('\n');
}

function formatDetectMitigation(bullets) {
  return ['## Mitigation', '', formatBulletList(bullets)].join('\n');
}

function formatZeroToHeroPlaybook(id, bullets) {
  const readme = `../../../scenarios/${PLAYBOOKS[id].scenarioDir}/README.md`;
  return [
    '## Mitigation Playbook',
    '',
    `Canonical prevention and mitigation controls (aligned with the [scenario README](${readme})). Lab walkthroughs above expand each control with hands-on steps.`,
    '',
    formatBulletList(bullets),
    '',
    '---',
    '',
  ].join('\n');
}

module.exports = {
  PLAYBOOKS,
  playbookBullets,
  readmePath,
  formatBulletList,
  formatReadmePlaybook,
  formatDetectMitigation,
  formatZeroToHeroPlaybook,
};
