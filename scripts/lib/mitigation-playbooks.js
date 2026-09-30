'use strict';

/** Canonical mitigation bullets and implementation blocks per scenario (01-25). Single source for README, DETECT, and zero-to-hero docs. */
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
      'Alert on unusual semver jumps and first-seen maintainers.',
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
- name: Alert on unusual semver jumps
  run: node scripts/check-version-jumps.js --threshold 2
\`\`\`

### 3. Namespace reservation

\`\`\`bash
# Reserve your org scope on public npm
npm access public @myorg
# or publish a placeholder package
\`\`\`

### 4. Version policy

Treat any resolved version above your internal threshold (for example, more than two major versions ahead of baseline or a first-seen maintainer) as a CI failure.`,
  },
  '03': {
    scenarioDir: '03-compromised-package',
    bullets: [
      'Require MFA and admin approval for maintainer role changes and publish tokens.',
      'Pin exact versions and enforce lockfile-only installs (`npm ci --ignore-scripts`) in CI.',
      'Alert on new maintainers, unexpected patch-version changes, and dependency additions in trusted packages.',
      'Run supply-chain scanners and diff reviews on every dependency update before merge.',
      'Segment CI permissions so a build job cannot publish packages or alter registry metadata.',
      'Maintain a known-good artifact mirror and rotate credentials after any suspected maintainer compromise.',
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
# .github/workflows/supply-chain-scan.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- name: Install dependencies without scripts
  run: npm ci --ignore-scripts
- name: Verify no unexpected patch drift
  run: node scripts/check-version-jumps.js --allow-patch-review secure-validator
- name: Supply-chain scan
  run: npx socket-dev scan
- name: Snyk test
  run: npx snyk test --severity-threshold=high
  env:
    SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
\`\`\`

### 3. Maintainer monitoring

\`\`\`bash
# Alert on new maintainers or publish events
npm view secure-validator maintainers
npm owner ls secure-validator
\`\`\`

### 4. Incident response

\`\`\`bash
npm install <package>@<known-good-version> --save-exact
rm -rf node_modules package-lock.json
npm ci
npm token revoke <token-id>
# Rotate any CI or registry credentials the maintainer account could reach
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
      'Pin every third-party action to an immutable commit SHA and verify it with an allowlist check.',
      'Set the minimum `permissions` on each workflow job and avoid granting `contents: write` when only read is needed.',
      'Do not pass repository secrets into third-party or reusable actions unless absolutely necessary; prefer OIDC and short-lived tokens.',
      'Protect reusable workflows and actions with branch rules, tag protection, CODEOWNERS, and signed tags.',
      'Monitor CI runner process trees and egress for unexpected secret access or outbound connections.',
      'Require security review of every workflow diff, especially new `uses` lines and mutable tag changes.',
      'Rotate CI secrets and revoke `GITHUB_TOKEN` after any suspected workflow injection incident.',
    ],
    implementation: `## Straightforward Implementation

### 1. Prevention config

Replace mutable tags with SHA-pinned references and tighten permissions:

\`\`\`yaml
# .github/workflows/build.yml
name: Build and publish
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b
        with:
          node-version: 20
      - run: npm ci --ignore-scripts
      - run: npm run build
      - uses: vendor/build-action@a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c
        with:
          artifact-path: dist/app.js
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

### 2. CI gate

Fail the build if a workflow uses a mutable tag:

\`\`\`yaml
# .github/workflows/lint-actions.yml
name: Lint action references
on: [pull_request]
jobs:
  lint-actions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - name: Reject mutable action tags
        run: |
          grep -R "uses:.*@v[0-9]" .github/workflows/ && exit 1 || true
\`\`\`

### 3. Detection rule location

Deploy the Sigma rule from DETECT.md to your SIEM under the supply-chain detection folder. Alert on:

- A CI step that reads \`GITHUB_TOKEN\` and then makes an outbound HTTP request
- \`process.env\` enumeration inside an action entrypoint
- New \`uses\` references or tag changes in workflow pull requests

### 4. Incident response

\`\`\`bash
# 1. Stop current runs and remove the malicious action reference
gh workflow disable build.yml
# 2. Rotate all secrets the workflow could access
gh secret set AWS_ACCESS_KEY_ID --body "<new-key>"
gh secret set AWS_SECRET_ACCESS_KEY --body "<new-secret>"
# 3. Pin to the last known-good SHA
sed -i 's/vendor\\/build-action@v1/vendor\\/build-action@<clean-sha>/' .github/workflows/build.yml
# 4. Audit recent runs for unexpected egress or artifact changes
\`\`\``,
  },
  '06': {
    scenarioDir: '06-sha-hulud',
    bullets: [
      'Store npm publish tokens only in CI/CD secrets; never keep them on developer machines.',
      'Run `npm ci --ignore-scripts` by default and allowlist only required lifecycle scripts.',
      'Require 2FA and publish provenance on npm maintainer accounts.',
      'Restrict GitHub personal access tokens to the smallest scope and shortest lifetime.',
      'Monitor CI and developer machines for unexpected `npm publish` or registry writes.',
      'Alert on postinstall scripts that read `~/.npmrc`, `~/.git-credentials`, or environment tokens.',
      'Rotate npm and GitHub tokens immediately after suspected compromise.',
    ],
    implementation: `## Straightforward Implementation

### 1. Prevention config

Disable lifecycle scripts by default:

\`\`\`ini
# .npmrc
ignore-scripts=true
\`\`\`

Store the publish token in CI only:

\`\`\`yaml
# .github/workflows/publish.yml
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: \${{ secrets.NPM_PUBLISH_TOKEN }}
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/install-gate.yml
- name: Install without lifecycle scripts
  run: npm ci --ignore-scripts
- name: Audit unexpected postinstall scripts
  run: node scripts/audit-lifecycle-scripts.js
\`\`\`

### 3. Detection rule location

Deploy Sigma or SIEM rules for:

- \`npm publish\` or \`npm login\` from developer hosts.
- Postinstall scripts reading \`~/.npmrc\` or \`~/.git-credentials\`.
- Outbound traffic to unexpected registry or GitHub API endpoints during installs.

### 4. Incident response

\`\`\`bash
# Revoke leaked tokens
npm token list
npm token revoke <token-id>
gh token list
gh token delete <token-id>

# Clean and reinstall without scripts
rm -rf node_modules package-lock.json
npm ci --ignore-scripts

# Audit published versions
npm view <package> versions --json
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
lockfile-lint --path package-lock.json   --allowed-hosts npm internal.registry.example   --allowed-schemes https:
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
      'Treat signatures and provenance as identity and integrity signals, not safety guarantees; pair with behavioral scanning.',
      'Publish npm packages with `--provenance` and verify with `npm audit signatures` or `gh attestation verify`.',
      'Store signing keys in HSMs or KMS with MFA, strict ACLs, and signing audit logs.',
      'Rotate keys on schedule and after maintainer departure or suspected compromise.',
      'Monitor CI workflow changes and signing-credential usage for unexpected events.',
      'Segment CI jobs so build runners cannot sign arbitrary artifacts or access signing keys.',
      'Verify artifact attestations from trusted CI identities before deployment.',
    ],
    implementation: `## Straightforward Implementation

### 1. Signature and attestation verification

\`\`\`bash
npm audit signatures
gh attestation verify <package>.tgz --repository org/secure-utils
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

Store signing keys in AWS KMS, GCP KMS, or Azure Key Vault. Rotate every 90 days or on maintainer departure. Require MFA for every signing operation.

### 4. CI hardening and behavioral analysis

Pin third-party actions by SHA, restrict workflow permissions to \`id-token: write\` and \`contents: read\`, and pair signature checks with supply-chain scanners (Socket, Snyk Supply Chain) that inspect package behavior.`,
  },
  '10': {
    scenarioDir: '10-git-submodule-attack',
    bullets: [
      'Review every submodule, subtree, or vendored dependency addition in pull requests.',
      'Validate embedded repository URLs against an allowlist; reject local `file://` and relative paths.',
      'Pin embedded dependencies to verified commits; do not track floating branch heads.',
      'Set `protocol.file.allow=never` globally and in CI runners to block CVE-2022-39253-style local protocol abuse.',
      'Scan subtree and vendored code with the same rules as git submodule code.',
      'Monitor initialization behavior and lifecycle scripts in build pipelines.',
    ],
    implementation: `## Straightforward Implementation

### 1. Pin submodules, subtrees, and vendored code to commits

\`\`\`bash
# git submodule
git submodule add https://github.com/org/lib.git
cd lib && git checkout <commit-sha>
cd .. && git commit -am "Pin submodule to commit"

# git subtree
git subtree add --prefix=vendor/lib https://github.com/org/lib.git <commit-sha> --squash
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/submodule-check.yml
- run: |
    git submodule foreach 'git log --oneline -1'
    git config --file .gitmodules --get-regexp 'url' | grep -v 'allowed-github.example.com' && exit 1 || true
- run: |
    # Block local file-protocol abuse for submodules, subtrees, and vendored fetches
    git config --global protocol.file.allow never
    test -d vendor && find vendor -type f -name '*.sh' -print | xargs -r grep -E 'curl|wget|nc ' && exit 1 || true
\`\`\`

### 3. CODEOWNERS

\`\`\`text
# .github/CODEOWNERS
.gitmodules @org/security-team
vendor/ @org/security-team
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
      'Assign CODEOWNERS to workspace package directories, root `package.json`, and task configuration files such as `nx.json` or `turbo.json`.',
      'Review `nx graph` or `turbo run` task boundaries before adding cross-package dependencies or tasks.',
      'Run workspace scans for lifecycle scripts, unexpected binaries, and dependency drift on every PR.',
      'Enforce `--ignore-scripts` in CI and require explicit allowlisting for required postinstall steps.',
      'Separate build/test/deploy permissions per workspace package and per CI stage.',
      'Treat every workspace package as a third-party dependency for security review.',
    ],
    implementation: `## Straightforward Implementation

### 1. CODEOWNERS

\`\`\`text
# .github/CODEOWNERS
/packages/* @org/security-team @org/platform-team
/package.json @org/security-team
/nx.json @org/security-team
/turbo.json @org/security-team
\`\`\`

### 2. Workspace graph and task boundary review

\`\`\`bash
# Nx
nx graph --file=dep-graph.json
# Turborepo
cat turbo.json | jq '.pipeline | keys'
\`\`\`

### 3. CI gate

\`\`\`yaml
# .github/workflows/workspace-audit.yml
- run: npm ci --ignore-scripts
- run: node scripts/audit-workspace-packages.js
- run: |
    # Fail if a task depends on a workspace package outside the approved graph
    node scripts/validate-task-boundaries.js --config nx.json
\`\`\`

### 4. Policy

Treat every workspace package - and every task that touches it - as a third-party dependency for security review purposes.`,
  },
  '13': {
    scenarioDir: '13-package-metadata-manipulation',
    bullets: [
      'Compare README, homepage, and repository URLs against a trusted source-of-truth; do not trust marketing copy.',
      'Validate registry API metadata against tarball `package.json`; reject mismatches in author, repository, homepage, or dist integrity.',
      'Pin exact versions and verify lockfile integrity hashes in CI.',
      'Maintain an internal mirror of approved artifacts with signed metadata.',
      'Require human review for dependency additions that change homepage, repository, or author fields.',
    ],
    implementation: `## Straightforward Implementation

### 1. Metadata validation

\`\`\`bash
# Registry API metadata
npm view clean-utils --json | jq '{name, version, author, repository, homepage, maintainers}'

# Tarball metadata
npm pack clean-utils
tar -xzf clean-utils-*.tgz
cat package/package.json | jq '{name, version, author, repository, homepage}'

# Compare the two; reject mismatches
\`\`\`

### 2. CI gate

\`\`\`yaml
# .github/workflows/metadata-check.yml
- run: npm ci --ignore-scripts
- run: node scripts/validate-package-metadata.js --allowlist allowed-packages.json
- run: node scripts/compare-registry-vs-tarball.js clean-utils
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
      'Install dev tools with `--ignore-scripts` by default and source only from approved registries.',
      'Review lockfile and `.gitignore` diffs for hidden entries after any tool install or update.',
      'Pin dev tool versions and verify checksums before distribution to developers.',
      'Run tool installs in sandboxed CI runners with egress controls and no production secrets.',
      'Require allowlist approval for new lifecycle scripts in dependency diffs.',
      'Rotate credentials and re-audit workstations if a dev tool shows install-time network beacons.',
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
    git diff --exit-code .gitignore || true
- run: |
    # Reject unexpected public registry sources for internal dev tools
    grep -E '"registry": "https://registry.npmjs.org"' package-lock.json && exit 1 || true
- run: |
    # Flag new postinstall/preinstall scripts
    node scripts/scan-lifecycle-scripts.js --allowlist allowed-scripts.json
\`\`\`

### 3. Diff review

Review every new \`postinstall\` or \`preinstall\` script, lockfile integrity change, and \`.gitignore\` entry in dependency update diffs. Use Socket or a custom PR check to flag them.

### 4. Isolation

Install dev tools in sandboxed CI runners with egress controls and no production secrets. Rotate CI credentials and audit developer workstations after any suspected install-time compromise.`,
  },
  '16': {
    scenarioDir: '16-package-cache-poisoning',
    bullets: [
      'Clear npm, pnpm, Yarn, and CI caches during incident response and after any registry compromise.',
      'Bind CI cache keys to `package-lock.json`/`pnpm-lock.yaml` hashes and revalidate integrity on restore.',
      'Use immutable artifact mirrors and deterministic installs (`npm ci`) in production pipelines.',
      'Monitor cache paths (`~/.npm`, `_cacache`, `~/.cache/pnpm`, `~/.yarn/cache`, GitHub Actions cache, Artifactory remote cache) for unauthorized mutations.',
      'Separate developer cache trust from production build trust boundaries.',
      'Document cache-invalidation playbooks for npm, pnpm, Yarn, GitHub Actions, and Artifactory.',
    ],
    implementation: `## Straightforward Implementation

### 1. Cache clearing

\`\`\`bash
# npm
npm cache clean --force
rm -rf ~/.npm/_cacache

# pnpm
pnpm store prune

# Yarn
yarn cache clean

# GitHub Actions
gh actions-cache list -R org/repo
gh actions-cache delete <key> -R org/repo --confirm
\`\`\`

### 2. CI cache key

\`\`\`yaml
# .github/workflows/ci.yml
- uses: actions/cache@0c45773b623bea8c8e75f6c82b208c3cf94ea4f9
  with:
    path: ~/.npm
    key: npm-\${{ hashFiles('package-lock.json') }}-\${{ github.run_id }}
    restore-keys: npm-\${{ hashFiles('package-lock.json') }}
\`\`\`

### 3. Remote cache invalidation (Artifactory example)

\`\`\`bash
# Remove a poisoned package from the remote/virtual cache
jf rt del --quiet npm-remote-cache/clean-utils/-/clean-utils-1.2.3.tgz
# Trigger metadata recalculation on the virtual repository
\`\`\`

### 4. Trust boundary

Do not reuse a developer's npm cache in production builds. Use ephemeral CI runners or immutable mirror caches. After any suspected registry incident, rotate cache keys and purge remote caches before rebuilding.`,
  },
  '17': {
    scenarioDir: '17-multi-stage-attack-chain',
    bullets: [
      'Correlate initial dependency access, lateral CI token abuse, and registry publish events before closing alerts.',
      'Segment CI service accounts so build runners cannot publish packages or deploy to production.',
      'Trigger auto-containment when dependency install, secret access, and publish events occur in short windows.',
      'Preserve per-stage forensic artifacts and run attack-chain tabletop exercises quarterly.',
      'Enforce least privilege on CI tokens and require approval gates for registry publishes.',
      'Maintain dependency allowlists and anomaly thresholds for first-seen packages or rapid version jumps.',
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

Use separate CI service accounts per stage. A build runner must not be able to publish packages or deploy to production. Store publish tokens in a dedicated secure vault, not in general build variables.

### 3. Auto-containment

Configure SOAR or CI webhooks to kill runners and revoke tokens when the sequence dependency install -> secret access -> registry publish occurs within a short window.

### 4. Tabletop exercises

Run quarterly attack-chain exercises against your CI/CD architecture. Preserve artifacts per stage for timeline reconstruction.`,
  },
  '18': {
    scenarioDir: '18-package-manager-plugin-attack',
    bullets: [
      'Treat `.pnpmfile.cjs` and `.yarn/plugins/*` as code requiring the same review as build scripts.',
      'Require CODEOWNERS approval for any hook file or plugin change.',
      'Run `pnpm install --frozen-lockfile` in CI and fail if the lockfile changes unexpectedly.',
      'Compare resolved dependencies against `package.json` declared dependencies in CI.',
      'Use isolated CI runners with restricted egress for install steps.',
      'Pin pnpm version and validate its checksum in CI.',
    ],
    implementation: `## Straightforward Implementation

### 1. CODEOWNERS for hook files

\`\`\`text
# .github/CODEOWNERS
.pnpmfile.cjs    @org/security-team
.yarn/plugins/*  @org/security-team
\`\`\`

### 2. CI gate - fail on frozen lockfile changes

\`\`\`yaml
# .github/workflows/ci.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- name: Install with frozen lockfile
  run: npx pnpm install --frozen-lockfile
- name: Verify no unexpected lockfile changes
  run: git diff --exit-code pnpm-lock.yaml
\`\`\`

### 3. Detect injected dependencies

\`\`\`bash
npx pnpm list --json | jq '.dependencies | keys'
\`\`\`

### 4. Isolate install in CI

\`\`\`yaml
- name: Install in sandbox
  run: npx pnpm install --frozen-lockfile
  env:
    NODE_ENV: production
\`\`\``,
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
      'Treat npm provenance and GitHub artifact attestations as identity and integrity signals, not safety guarantees.',
      'Pin expected builder identity, repository, and ref in a verification policy that fails closed.',
      'Run behavioral scans on installed packages even when signatures and provenance verify.',
      'Monitor CI workflow changes and signing-credential usage for unexpected events.',
      'Segment CI jobs so build runners cannot sign arbitrary artifacts or access signing keys.',
      'Publish to and verify against a transparency log when the registry supports it.',
      'Require lockfiles and deterministic npm ci installs in CI pipelines.',
    ],
    implementation: `## Straightforward Implementation

### 1. Prevention config

Enable provenance verification and configure npm to require attestations where available:

\`\`\`ini
# .npmrc
provenance=true
\`\`\`

\`\`\`bash
npm audit signatures
\`\`\`

### 2. Builder identity allowlist

\`\`\`javascript
// scripts/verify-provenance-policy.js
const allowedBuilders = [
  'https://github.com/myorg/trusted-logger/.github/workflows/publish.yml@refs/heads/main'
];

function checkProvenance(bundle) {
  const builderId = bundle.predicate.runDetails.builder.id;
  if (!allowedBuilders.includes(builderId)) {
    throw new Error(\`Unexpected builder: \${builderId}\`);
  }
}
\`\`\`

### 3. CI gate

\`\`\`yaml
# .github/workflows/install-check.yml
- run: npm ci --ignore-scripts
- run: npm audit signatures
- run: node scripts/verify-provenance-policy.js
- run: node scripts/behavioral-scan.js
\`\`\`

### 4. Workflow and key monitoring

Alert when the publish workflow file or the signing credential is modified. Review GitHub organization audit logs and cloud HSM/key vault logs for unexpected signing events. Rotate keys and revoke npm tokens after suspected CI compromise.`,
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
find .venv -name "*.pth" -exec cat {} ;
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
  '24': {
    scenarioDir: '24-slopsquatting',
    bullets: [
      'Verify every package name on the public registry before installing a command copied from generated content.',
      'Prefer internal or scoped packages for reusable utility code.',
      'Run `npm install --ignore-scripts` and inspect package contents before allowing scripts.',
      'Maintain an approved-dependency allowlist and require security review for every new name.',
      'Pin exact versions and commit lockfiles so a slopsquat cannot slip in through a loose semver range.',
      'Scan dependency diffs for network requests, environment access, and eval-like patterns.',
    ],
    implementation: `## Straightforward Implementation

### 1. Prevention config

Create or update \`.npmrc\` in the repo root:

\`\`\`ini
# .npmrc
@myorg:registry=https://internal.registry.example/
ignore-scripts=true
\`\`\`

### 2. Pre-install verification

\`\`\`bash
npm view array-sortify --json | jq '{name, version, maintainers, repository, time}'
npm pack array-sortify
tar -xzf array-sortify-*.tgz && cat package/index.js
\`\`\`

### 3. CI gate

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

### 4. Incident response

\`\`\`bash
npm uninstall array-sortify
rm -rf node_modules package-lock.json
npm ci
npm token list
npm token revoke <token-id>
\`\`\``,
  },
  '25': {
    scenarioDir: '25-compromised-github-action',
    bullets: [
      'Pin every reusable action to an immutable commit SHA, never a mutable tag.',
      'Audit workflow files for tag references and enforce SHA pinning via CI lint or policy.',
      'Apply least-privilege permissions and avoid passing secrets to third-party actions as environment variables.',
      'Monitor CI runners for unexpected outbound network calls.',
      'Rotate CI secrets immediately when a reusable action compromise is reported or suspected.',
      'Use tools like `step-security/harden-runner` to block unexpected egress from action steps.',
    ],
    implementation: `## Straightforward Implementation

### 1. Pin actions by SHA

\`\`\`yaml
# .github/workflows/ci.yml
- name: Checkout
  uses: example/actions/checkout@a1b2c3d4e5f6789012345678901234567890abcd
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
      github.com:443
      registry.npmjs.org:443
\`\`\`

### 4. Credential rotation

\`\`\`bash
# Rotate all secrets accessible to affected pipeline runs
gh secret set GITHUB_TOKEN --repo org/repo --body "..."
aws iam create-access-key --user-name ci-user
# Update any database, registry, or cloud credentials the action could reach
\`\`\``,
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
