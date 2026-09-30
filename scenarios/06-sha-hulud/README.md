# Scenario 6: Token-Theft and Re-Publishing Worm (Shai-Hulud)

> **Simulation scope:** This is a simplified educational model. The install-time payload runs only when `TESTBENCH_MODE=enabled` and only targets `127.0.0.1` mock servers. No real npm or GitHub API calls are made.




## Table of Contents

<div class="doc-toc">

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Scenario Description](#scenario-description)
- [How the Worm Spreads](#how-the-worm-spreads)
- [Setup](#setup)
- [Run the lab](#run-the-lab)
- [Lab Tasks](#lab-tasks)
- [Mitigation Playbook](#mitigation-playbook)
- [Straightforward Implementation](#straightforward-implementation)
- [Success Criteria](#success-criteria)
- [Bonus Challenges](#bonus-challenges)
- [Key Takeaways](#key-takeaways)

</div>

---
## Learning Objectives

By completing this scenario, you will learn:

- How a malicious npm package can steal publish tokens from a developer machine.
- Why stolen npm tokens let an attacker re-publish malware under a victim's own package name.
- How stolen GitHub tokens enable backdoor pull requests.
- Why self-replicating worms spread through credentials, not magic.
- How to detect and prevent token-theft and re-publishing attacks.

## Background

**Shai-Hulud** (named after the giant sandworms from Dune) now models a realistic token-theft and re-publishing worm. In this lab, a malicious package called `shai-hulud` is installed via `npm install`. Its `postinstall` script harvests npm and GitHub tokens from the local environment and then uses those tokens to spread:

1. The stolen **npm token** is used to publish a new, infected version of a package the victim maintains.
2. The stolen **GitHub token** is used to open a backdoor pull request.

The payload is gated by `TESTBENCH_MODE=enabled` and only communicates with three local mock servers:

- `credential-harvester.js` on port `3001` receives exfiltrated tokens.
- `mock-registry.js` on port `3003` receives simulated malicious publish attempts.
- `github-actions-simulator.js` on port `3002` receives simulated backdoor PRs.

## Scenario Description

A development team installs a small utility called `shai-hulud` in their private workspace. The workspace also contains an internal package called `victim-utils` that the team maintains. The attacker controls `shai-hulud` and has added a malicious `postinstall` script.

During `npm install`, the script:

1. Reads `~/.npmrc` and `~/.git-credentials` (plus the project `.npmrc` and `.env` as fallbacks).
2. Extracts the npm `_authToken` and a GitHub personal access token.
3. POSTs the harvested tokens to the credential harvester at `127.0.0.1:3001`.
4. Bumps the patch version of `victim-utils`, adds the same `postinstall` script, and POSTs a simulated malicious publish to `127.0.0.1:3003/publish`.
5. POSTs a simulated backdoor PR to `127.0.0.1:3002/backdoor-pr`.

The application still works normally, so the compromise is easy to miss.

## How the Worm Spreads

The worm does not self-replicate through unknown magic. It replicates because it stole the **ability to publish**:

- The npm token gives the attacker write access to the victim's packages.
- Every newly published infected version repeats the same `postinstall` script.
- Anyone who installs the updated package also exposes their tokens, and the cycle continues.

This is the core learning point: **worms spread by stealing publish tokens and re-publishing.**

## Setup

```bash
cd scenarios/06-sha-hulud
export TESTBENCH_MODE=enabled
./setup.sh
```

`setup.sh` creates:

- `malicious-packages/shai-hulud/` - the malicious package with `postinstall.js`.
- `templates/shai-hulud-postinstall.js` - a reusable template of the payload.
- `victim-app/` - the workspace that installs `shai-hulud` and maintains `victim-utils`.
- `infrastructure/credential-harvester.js` - mock C2 for tokens on port `3001`.
- `infrastructure/mock-registry.js` - mock npm registry on port `3003`.
- `infrastructure/github-actions-simulator.js` - mock GitHub on port `3002`.
- Lookalike npm/GitHub fixtures in `victim-app/.npmrc`, `victim-app/.env`, and `~/.git-credentials`.

## Run the lab

Use two terminals. All paths are relative to `scenarios/06-sha-hulud`.

### Terminal A - mock servers

```bash
cd infrastructure
node credential-harvester.js &
node github-actions-simulator.js &
node mock-registry.js &
cd ..
```

Keep this terminal open.

### Terminal B - review, install, and run

```bash
# Review the payload
cat malicious-packages/shai-hulud/postinstall.js

# Review the victim workspace
cat victim-app/package.json
cat victim-app/packages/victim-utils/package.json

# Trigger the attack
cd victim-app
export TESTBENCH_MODE=enabled
npm install
```

### Verify the evidence

```bash
# Harvested tokens
curl -s http://localhost:3001/captured-credentials

# Simulated malicious publish
curl -s http://localhost:3003/published-packages

# Simulated backdoor PR
curl -s http://localhost:3002/backdoor-prs
```

### Run the victim application

```bash
cd victim-app
npm start
```

The app runs normally even though the worm already executed during install.

## Lab Tasks

### Part 1: Inspect the malicious package (15 minutes)

```bash
cat malicious-packages/shai-hulud/package.json
cat malicious-packages/shai-hulud/postinstall.js
cat malicious-packages/shai-hulud/index.js
```

Questions:

- What triggers the payload?
- Which files does it read for tokens?
- Where does it exfiltrate data?
- How does it simulate re-publishing?

### Part 2: Observe the token-theft chain (20 minutes)

1. Start the three mock servers.
2. Install the malicious package in `victim-app/`.
3. Check `http://localhost:3001/captured-credentials` for harvested npm and GitHub tokens.

Note the `TESTBENCH_MODE` gate. If the environment variable is not set, the payload exits immediately.

### Part 3: Observe the re-publishing chain (20 minutes)

1. Check `http://localhost:3003/published-packages` for the simulated malicious publish of `victim-utils`.
2. Check `http://localhost:3002/backdoor-prs` for the simulated backdoor PR.
3. Compare the original `victim-app/packages/victim-utils/package.json` with the published payload to see what changed.

### Part 4: Detection (25 minutes)

Run the scenario detectors:

```bash
# From scenarios/06-sha-hulud/
node detection-tools/postinstall-monitor.js victim-app/node_modules/shai-hulud
node detection-tools/credential-scanner.js victim-app
```

Also check:

```bash
# Unexpected lifecycle scripts
grep -R "postinstall" victim-app/node_modules/*/package.json

# Unexpected localhost beacons in installed packages
grep -R "127.0.0.1:3001\|127.0.0.1:3002\|127.0.0.1:3003" victim-app/node_modules
```

### Part 5: Incident response (20 minutes)

If this were a real compromise, your response would include:

1. Revoke the leaked npm token and GitHub token immediately.
2. Remove the malicious package: `npm uninstall shai-hulud`.
3. Audit every package the victim maintains for unexpected versions.
4. Review GitHub pull requests for backdoors added with the stolen token.
5. Rotate all CI and developer secrets.
6. Reinstall dependencies with `npm ci --ignore-scripts`.

## Mitigation Playbook

- Store npm publish tokens only in CI/CD secrets; do not keep them on developer machines.
- Use `npm ci --ignore-scripts` by default and allowlist only required lifecycle scripts.
- Require 2FA and publish provenance on npm maintainer accounts.
- Restrict GitHub personal access tokens to the smallest scope and shortest lifetime.
- Enforce branch protection and code review for every pull request.
- Monitor registry publish history and CI logs for unexpected `npm publish` commands.
- Alert on postinstall scripts that read `~/.npmrc`, `~/.git-credentials`, or environment tokens.
- Rotate tokens immediately after suspected compromise.

## Straightforward Implementation

### 1. Prevention config

Disable lifecycle scripts by default:

```ini
# .npmrc
ignore-scripts=true
```

Store the publish token in CI only:

```yaml
# .github/workflows/publish.yml
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}
```

### 2. CI gate

```yaml
# .github/workflows/install-gate.yml
- name: Install without lifecycle scripts
  run: npm ci --ignore-scripts

- name: Audit unexpected postinstall scripts
  run: |
    node scripts/audit-lifecycle-scripts.js
```

### 3. Detection rule location

Deploy Sigma or SIEM rules for:

- `npm publish` or `npm login` from developer hosts.
- Postinstall scripts reading `~/.npmrc` or `~/.git-credentials`.
- Outbound traffic to unusual registry or GitHub API endpoints during installs.

### 4. Incident response

```bash
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
```

## Success Criteria

You have completed this scenario when you can:

- [ ] Explain how the `shai-hulud` postinstall script steals tokens.
- [ ] Show harvested tokens in the credential harvester.
- [ ] Show a simulated malicious publish in the mock registry.
- [ ] Show a simulated backdoor PR in the GitHub simulator.
- [ ] Detect the payload with the provided scanners.
- [ ] List concrete prevention controls for publish-token theft.
- [ ] Explain why worms spread through stolen publish tokens.

## Bonus Challenges

1. **Scope restriction**: Modify the payload to use a GitHub token with only `repo` scope and show what it cannot do.
2. **Detection evasion**: How would an attacker hide the postinstall script? How would you still detect it?
3. **Automated response**: Write a script that clears captured evidence and revokes a mock token after detection.
4. **Registry monitoring**: Add a CI gate that fails if `npm view <package>` shows a version published outside office hours.
5. **Floci track**: Enable `SCAS_FLOCI_ENABLED=1` and mirror harvested tokens to S3.

## Key Takeaways

- **Worms need credentials to spread.** Self-replication is not magic; it is publishing.
- **Publish tokens are high-value targets.** Protect them like production secrets.
- **Lifecycle scripts are dangerous.** Default-deny them and allowlist only what is required.
- **Backdoor PRs can be automated.** Stolen GitHub tokens let attackers modify source code at scale.
- **Detection requires monitoring both installs and publishes.** Watch postinstall behavior, registry writes, and unusual PRs.

---

**Next:** Review other scenarios to understand different supply-chain attack vectors.
