'use strict';

/** Canonical mitigation bullets and implementation blocks per scenario (01-23). Single source for README, DETECT, and zero-to-hero docs. */
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
    implementation: `## Straightforward Implementation

### 1. Prevention config

Create or update ".npmrc" in the repo root:

\`\`\`ini
# .npmrc
@myorg:registry=https://internal.registry.example/
ignore-scripts=true
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/dependency-review.yml
name: Dependency Review
on: [pull_request]
jobs:
  dependency-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/dependency-review-action@3b139cfc5fae8b618dfb3e11a0a753bf0c333854
        with:
          fail-on-severity: moderate
      - uses: socket-security/action@latest
        env:
          SOCKET_SECURITY_API_KEY: \${{ secrets.SOCKET_API_KEY }}
\`\`\`

### 3. Pre-install verification

\`\`\`bash
npm view <package> --json | jq '{name, version, maintainers, repository}'
npm pack <package>
tar -xzf <package>-*.tgz && cat package/index.js
\`\`\`

### 4. Incident response

\`\`\`bash
npm uninstall <typo-package>
npm token list
npm token revoke <token-id>
\`\`\``,
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
    implementation: `## Straightforward Implementation

### 1. Prevention config

\`\`\`ini
# .npmrc
@myorg:registry=https://artifactory.example.com/api/npm/npm-internal/
//artifactory.example.com/api/npm/npm-internal/:_authToken=\${NPM_TOKEN}
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/registry-validation.yml
- name: Ensure private scopes never resolve from public npm
  run: |
    npm ci --ignore-scripts
    npm ls @myorg --json | grep -q 'registry.npmjs.org' && exit 1 || true
\`\`\`

### 3. Namespace reservation

\`\`\`bash
# Reserve your org scope on public npm
npm access public @myorg
# or publish a placeholder package
\`\`\`

### 4. Version policy

Treat any resolved version above your internal threshold (for example, more than 10 major versions ahead of baseline) as a CI failure.`,
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
    implementation: `## Straightforward Implementation

### 1. CI gate

\`\`\`yaml
# .github/workflows/supply-chain-scan.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- name: Install dependencies without scripts
  run: npm ci --ignore-scripts
- name: Supply-chain scan
  run: npx socket-dev scan
- name: Snyk test
  run: npx snyk test --severity-threshold=high
  env:
    SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
\`\`\`

### 2. Runtime monitoring

\`\`\`bash
node -r ./security/module-load-logger.js app.js
\`\`\`

### 3. Maintainer policy

Require 2FA and admin approval for npm publishing roles. Alert on new maintainers via npm webhook or GitHub organization audit log.

### 4. Incident response

\`\`\`bash
npm install <package>@<known-good-version> --save-exact
rm -rf node_modules package-lock.json
npm ci
npm token revoke <token-id>
\`\`\``,
  },
  '04': {
    scenarioDir: '04-malicious-update',
    bullets: [
      'Pin exact versions in `package.json` - avoid carets on sensitive dependencies.',
      'Commit lockfiles and use `npm ci` in CI/CD pipelines.',
      'Verify updates before install (changelog review, integrity checks, code diff).',
      'Scan dependency updates automatically in CI before merge.',
      'Use staged rollouts - test updates in staging before production.',
      'Require human review of changelogs for patch and minor bumps on critical packages.',
    ],
    implementation: `## Straightforward Implementation

### 1. Prevention config

\`\`\`json
// package.json
{
  "dependencies": {
    "express": "4.18.2"
  }
}
\`\`\`

### 2. Dependabot config

\`\`\`yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
\`\`\`

### 3. Update review

\`\`\`bash
npx npm-diff <package>@<old> <package>@<new>
npx socket-dev diff
\`\`\`

### 4. Staged rollout

Merge dependency updates to a "staging" branch first. Run smoke tests for 24 hours before promoting to "main".`,
  },
  '05': {
    scenarioDir: '05-build-compromise',
    bullets: [
      'Verify build script integrity with checksums before each build.',
      'Apply least privilege to CI/CD jobs and secret exposure.',
      'Run builds in isolated environments with minimal credentials.',
      'Verify build artifacts with checksums and signed attestations.',
      'Use secret management tools - never hardcode secrets in build scripts.',
      'Audit and log all build activities for forensic review.',
      'Sign release artifacts and verify signatures before deployment.',
    ],
    implementation: `## Straightforward Implementation

### 1. CI gate (OIDC, no long-lived secrets)

\`\`\`yaml
# .github/workflows/build.yml
permissions:
  id-token: write
  contents: read
steps:
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
  - uses: aws-actions/configure-aws-credentials@e3dd6a429a730001a79de495f50a554053c04fbc
    with:
      role-to-assume: arn:aws:iam::ACCOUNT:role/build-role
  - run: npm ci --ignore-scripts
  - run: npm run build
\`\`\`

### 2. Artifact signing

\`\`\`bash
cosign sign-blob --yes artifact.tgz --output-signature artifact.tgz.sig
\`\`\`

### 3. SLSA provenance

\`\`\`yaml
# Reusable workflow reference
uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.0.0
\`\`\`

### 4. Build isolation

Use ephemeral CI runners or containers. Never reuse a runner that has built a different repository without re-imaging.`,
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
    implementation: `## Straightforward Implementation

### 1. Default deny lifecycle scripts

\`\`\`bash
npm ci --ignore-scripts
\`\`\`

### 2. Allowlist required scripts

\`\`\`yaml
# allowed-scripts.yml
allowed:
  - electron:postinstall
  - esbuild:postinstall
\`\`\`

### 3. Credential rotation

\`\`\`bash
npm token list
npm token revoke <token-id>
gh ssh-key list
gh ssh-key delete <id>
\`\`\`

### 4. Cache clearing

\`\`\`bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm ci --ignore-scripts
\`\`\``,
  },
  '07': {
    scenarioDir: '07-transitive-dependency',
    bullets: [
      'Pin exact dependency versions - avoid loose semver ranges on critical packages.',
      'Commit `package-lock.json` and use `npm ci` in CI/CD.',
      'Run automated scanning (`npm audit`, SBOM tools) across the full dependency tree.',
      'Generate and maintain SBOMs for transitive dependency visibility.',
      'Monitor postinstall script execution and unexpected network requests.',
      'Review the full dependency tree regularly, not only direct dependencies.',
    ],
    implementation: `## Straightforward Implementation

### 1. SBOM generation

\`\`\`bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
# or
npx syft dir:. -o cyclonedx-json > sbom.json
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/sbom.yml
- run: npm ci --ignore-scripts
- run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json
- run: node scripts/validate-sbom-against-lockfile.js sbom.json package-lock.json
\`\`\`

### 3. Full-tree review

\`\`\`bash
npm ls --all > dependency-tree.txt
# Review monthly or on every major dependency update
\`\`\`

### 4. Note on limits

"> npm audit" finds known CVEs, not novel malware in transitive packages. Pair it with supply-chain scanners and runtime monitoring.`,
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
    implementation: `## Straightforward Implementation

### 1. Lockfile lint

\`\`\`bash
npm install -g lockfile-lint
lockfile-lint --path package-lock.json \
  --allowed-hosts npm internal.registry.example \
  --allowed-schemes https:
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/lockfile-check.yml
- run: npm ci --ignore-scripts
- run: git diff --exit-code package-lock.json
- run: npx lockfile-lint --path package-lock.json --allowed-hosts npm
\`\`\`

### 3. Pre-commit hook

\`\`\`bash
# .git/hooks/pre-commit or husky
if git diff --cached --name-only | grep -q package-lock.json; then
  npx lockfile-lint --path package-lock.json --allowed-hosts npm
fi
\`\`\`

### 4. Policy

Never allow "file:", "link:", or "git+ssh" dependencies in production lockfiles without explicit security review.`,
  },
  '09': {
    scenarioDir: '09-package-signing-bypass',
    bullets: [
      'Protect signing keys with HSMs or hardened secret stores.',
      'Require MFA for all key access and signing operations.',
      'Rotate signing keys on a regular schedule and after incidents.',
      'Limit who can sign packages with strict access controls.',
      'Always verify signatures - but pair with behavioral and content analysis.',
      'Monitor signing activity for anomalies (time, volume, key fingerprint).',
    ],
    implementation: `## Straightforward Implementation

### 1. Signature verification

\`\`\`bash
npm audit signatures
\`\`\`

### 2. Publish with provenance

\`\`\`yaml
# .github/workflows/publish.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b
  with:
    node-version: 20
    registry-url: https://registry.npmjs.org
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
\`\`\`

### 3. Key management

Store signing keys in AWS KMS, GCP KMS, or Azure Key Vault. Rotate every 90 days or on maintainer departure.

### 4. Behavioral analysis

Pair signature checks with supply-chain scanners (Socket, Snyk Supply Chain) that inspect package behavior.`,
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
    implementation: `## Straightforward Implementation

### 1. Pin submodules to commits

\`\`\`bash
git submodule add https://github.com/org/lib.git
cd lib && git checkout <commit-sha>
cd .. && git commit -am "Pin submodule to commit"
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/submodule-check.yml
- run: |
    git submodule foreach 'git log --oneline -1'
    git config --file .gitmodules --get-regexp 'url' | grep -v 'allowed-github.example.com' && exit 1 || true
\`\`\`

### 3. CODEOWNERS

\`\`\`text
# .github/CODEOWNERS
.gitmodules    @org/security-team
\`\`\`

### 4. Git config

\`\`\`bash
git config --global protocol.file.allow never
\`\`\``,
  },
  '11': {
    scenarioDir: '11-registry-mirror-poisoning',
    bullets: [
      'Secure mirror access - limit who can publish or modify mirror storage.',
      'Audit mirror configuration and cached packages on a schedule.',
      'Verify mirror packages match upstream registry digests.',
      'Implement strict access controls and MFA on mirror admin paths.',
      'Monitor mirror behavior and alert on unexpected package mutations.',
    ],
    implementation: `## Straightforward Implementation

### 1. Mirror config example (Verdaccio)

\`\`\`yaml
# verdaccio/config.yaml
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: true
    integrity: true
\`\`\`

### 2. Upstream digest check

\`\`\`bash
npm view <pkg> dist.shasum
sha1sum /path/to/mirror/cache/<pkg>/*.tgz
\`\`\`

### 3. Admin hardening

Require MFA on mirror admin accounts. Alert on package overwrites or deletions.

### 4. Audit cadence

Run a weekly job that compares a sample of mirrored packages against upstream metadata.`,
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
    implementation: `## Straightforward Implementation

### 1. CODEOWNERS

\`\`\`text
# .github/CODEOWNERS
/packages/*     @org/security-team @org/platform-team
/package.json   @org/security-team
\`\`\`

### 2. Workspace graph check

\`\`\`bash
nx graph --file=dep-graph.json
\`\`\`

### 3. CI gate

\`\`\`yaml
# .github/workflows/workspace-audit.yml
- run: npm ci --ignore-scripts
- run: node scripts/audit-workspace-packages.js
\`\`\`

### 4. Policy

Treat every workspace package as a third-party dependency for security review purposes.`,
  },
  '13': {
    scenarioDir: '13-package-metadata-manipulation',
    bullets: [
      'Validate metadata against trusted allowlists for critical packages.',
      'Require lockfile and integrity verification in CI.',
      'Pin exact versions for sensitive dependencies.',
      'Mirror and sign internal-approved artifacts.',
    ],
    implementation: `## Straightforward Implementation

### 1. Metadata validation

\`\`\`bash
npm view <pkg> --json | jq '{name, version, author, repository, maintainers}'
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/metadata-check.yml
- run: npm ci --ignore-scripts
- run: node scripts/validate-package-metadata.js --allowlist allowed-packages.json
\`\`\`

### 3. Allowlist maintenance

Store allowed package metadata in version control. Update only through pull request with security review.

### 4. SBOM comparison

Compare generated SBOM against the lockfile to detect omitted or altered dependencies.`,
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
    implementation: `## Straightforward Implementation

### 1. Digest pinning

\`\`\`dockerfile
# Dockerfile
FROM node:20.11.0-alpine@sha256:abcdef123...
\`\`\`

### 2. Image signing and verification

\`\`\`bash
cosign sign --yes registry.example/image@sha256:...
cosign verify --key cosign.pub registry.example/image@sha256:...
\`\`\`

### 3. BuildKit provenance

\`\`\`bash
docker buildx build --provenance=true --sbom=true -t image:tag .
\`\`\`

### 4. Admission control

Use Kyverno or OPA Gatekeeper to reject pods that use images without signatures or digests.`,
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
    implementation: `## Straightforward Implementation

### 1. Install policy

\`\`\`bash
npm install --ignore-scripts --registry https://internal.registry.example/ <dev-tool>
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/dev-tool-check.yml
- run: |
    npm ci --ignore-scripts
    grep -E '"registry": "https://registry.npmjs.org"' package-lock.json && exit 1 || true
\`\`\`

### 3. Diff review

Review every new "postinstall" or "preinstall" script in dependency update diffs. Use Socket or a custom PR check to flag them.

### 4. Isolation

Install dev tools in sandboxed CI runners with egress controls. Rotate CI credentials after any suspected install-time compromise.`,
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
    implementation: `## Straightforward Implementation

### 1. Cache clearing

\`\`\`bash
npm cache clean --force
\`\`\`

### 2. CI cache key

\`\`\`yaml
# .github/workflows/ci.yml
- uses: actions/cache@0c45773b623bea8c8e75f6c82b208c3cf94ea4f9
  with:
    path: ~/.npm
    key: npm-\${{ hashFiles('package-lock.json') }}
\`\`\`

### 3. GitHub Actions cache cleanup

\`\`\`bash
gh actions-cache list -R org/repo
gh actions-cache delete <key> -R org/repo --confirm
\`\`\`

### 4. Trust boundary

Do not reuse a developer's npm cache in production builds. Use ephemeral CI runners or immutable mirror caches.`,
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
    implementation: `## Straightforward Implementation

### 1. Correlation rule (pseudo-Splunk)

\`\`\`spl
| tstats \`security\` count from datamodel=Endpoint.Processes
  where Processes.process="npm install" by _time host
| join host [ search eventtype=network_traffic dest_port=443 ]
| where relative_time(_time,"-5m") < first_event_time
| where event_count >= 3
\`\`\`

### 2. Segmentation

Use separate CI service accounts per stage. A build runner must not be able to publish packages or deploy to production.

### 3. Auto-containment

Configure SOAR or CI webhooks to kill runners and revoke tokens when stage transitions occur within a short window.

### 4. Tabletop exercises

Run quarterly attack-chain exercises against your CI/CD architecture. Preserve artifacts per stage for timeline reconstruction.`,
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
    implementation: `## Straightforward Implementation

### 1. Plugin allowlist

\`\`\`yaml
# allowed-plugins.yml
allowed:
  - @yarnpkg/plugin-typescript
  - @pnpm/plugin-engines
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/plugin-check.yml
- run: |
    ls .yarn/plugins .pnpmfile.cjs 2>/dev/null || true
    node scripts/validate-plugins-against-allowlist.js
\`\`\`

### 3. Integrity check

\`\`\`bash
# Compare node_modules state against lockfile
npm ci --ignore-scripts
npm ls
\`\`\`

### 4. Review policy

Review plugin code changes with the same rigor as build scripts. Alert on hook-driven file changes outside expected paths.`,
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
    implementation: `## Straightforward Implementation

### 1. SBOM generation

\`\`\`bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/sbom.yml
- run: npm ci --ignore-scripts
- run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json
- run: node scripts/validate-sbom.js --lockfile package-lock.json --sbom sbom.json
- run: cosign sign-blob --yes sbom.json --output-signature sbom.json.sig
\`\`\`

### 3. Policy enforcement

Use OPA or Conftest to enforce that SBOMs contain required packages and no unexpected additions.

### 4. Runtime diff

Periodically compare the production SBOM against runtime inventory scans (Syft, Trivy).`,
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
    implementation: `## Straightforward Implementation

### 1. Dependabot config

\`\`\`yaml
# .github/dependabot.yml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
\`\`\`

### 2. Semver policy

Any dependency update that jumps more than one major version requires security review.

### 3. Scoped registry

\`\`\`ini
# .npmrc
@myorg:registry=https://artifactory.example.com/api/npm/npm-internal/
\`\`\`

### 4. CI gate

\`\`\`yaml
- run: npm ci --ignore-scripts
- run: node scripts/check-version-jumps.js --threshold 2
\`\`\``,
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
    implementation: `## Straightforward Implementation

### 1. Enable provenance

\`\`\`bash
npm config set provenance true
\`\`\`

### 2. Org-wide hunt

\`\`\`bash
gh search code "axios-like" --owner=myorg
\`\`\`

### 3. CI gate

\`\`\`yaml
- run: npm ci --ignore-scripts
- run: npx socket-dev scan
\`\`\`

### 4. Incident response

\`\`\`bash
rm -rf node_modules package-lock.json
npm install <package>@<known-good-version> --save-exact
npm token revoke <token-id>
\`\`\``,
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
    implementation: `## Straightforward Implementation

### 1. Hash pinning

\`\`\`bash
# Generate requirements with hashes
pip-compile --generate-hashes requirements.in
pip install --require-hashes -r requirements.txt
\`\`\`

### 2. .pth scan

\`\`\`bash
find .venv -name "*.pth" -exec cat {} \;
\`\`\`

### 3. CI gate

\`\`\`yaml
# .github/workflows/python-security.yml
- run: python -m venv .venv
- run: .venv/bin/pip install --require-hashes -r requirements.txt
- run: .venv/bin/python scripts/scan-pth-files.py .venv
\`\`\`

### 4. Token rotation

\`\`\`bash
# Revoke PyPI tokens via pypi.org/manage/account/
pypi-token-revoke <token-id>
\`\`\``,
  },
  '23': {
    scenarioDir: '23-trivy-supply-chain-attack',
    bullets: [
      'Contain: disable and re-queue all pipelines that ran `trivy-action@v0.34.x` or `setup-trivy@v0.2.5` or earlier after March 19 2026.',
      'Eradicate: replace every mutable tag reference with an immutable commit SHA (`aquasecurity/trivy-action@<SHA>`).',
      'Recover: rotate all CI secrets (GITHUB_TOKEN, AWS keys, registry credentials, database URLs) accessible to affected pipeline runs.',
      'Hunt: scan every workflow YAML in the organization for compromised version strings; check Dockerfiles and container registries for `trivy:0.69.4/5/6`.',
      'Harden: enforce SHA pinning for all third-party actions via policy (e.g. `step-security/harden-runner`, Allstar, or custom CI lint); alert on unexpected outbound network calls from action steps.',
    ],
    implementation: `## Straightforward Implementation

### 1. Pin actions by SHA

\`\`\`yaml
# .github/workflows/security.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- uses: aquasecurity/trivy-action@<full-sha>
\`\`\`

### 2. Audit workflow files

\`\`\`bash
grep -R "uses:.*@v" .github/workflows/ && exit 1
\`\`\`

### 3. Harden runner

\`\`\`yaml
- uses: step-security/harden-runner@<full-sha>
  with:
    egress-policy: block
    allowed-endpoints: |
      registry.npmjs.org:443
\`\`\`

### 4. Credential rotation

Rotate GITHUB_TOKEN, AWS keys, registry credentials, and database URLs accessible to affected pipeline runs. Use short-lived OIDC tokens where possible.`,
  },
};

function playbookBullets(id) {
  const entry = PLAYBOOKS[id];
  if (!entry) throw new Error(`Unknown scenario id: ${id}`);
  return entry.bullets;
}

function playbookImplementation(id) {
  const entry = PLAYBOOKS[id];
  if (!entry) throw new Error(`Unknown scenario id: ${id}`);
  return entry.implementation || '';
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

function formatReadmeImplementation(impl) {
  if (!impl) return '';
  return `${impl}\n\n`;
}

function formatDetectMitigation(bullets) {
  return ['## Mitigation', '', formatBulletList(bullets)].join('\n');
}

function formatDetectImplementation(impl) {
  if (!impl) return '';
  return `\n\n${impl}`;
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

function formatZeroToHeroImplementation(impl) {
  if (!impl) return '';
  return `${impl}\n\n---\n\n`;
}

module.exports = {
  PLAYBOOKS,
  playbookBullets,
  playbookImplementation,
  readmePath,
  formatBulletList,
  formatReadmePlaybook,
  formatReadmeImplementation,
  formatDetectMitigation,
  formatDetectImplementation,
  formatZeroToHeroPlaybook,
  formatZeroToHeroImplementation,
};
