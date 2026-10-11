# Scenario 5: GitHub Actions Workflow Injection



## Table of Contents

<div class="doc-toc">

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Scenario Description](#scenario-description)
- [Setup](#setup)
- [Run the Lab](#run-the-lab)
- [Lab Tasks](#lab-tasks)
- [Mitigation Playbook](#mitigation-playbook)
- [Straightforward Implementation](#straightforward-implementation)
- [Success Criteria](#success-criteria)
- [Bonus Challenges](#bonus-challenges)
- [Additional Resources](#additional-resources)
- [Related Scenarios](#related-scenarios)

</div>

---
## Table of Contents

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Scenario Description](#scenario-description)
- [Setup](#setup)
- [Run the Lab](#run-the-lab)
- [Lab Tasks](#lab-tasks)
- [Mitigation Playbook](#mitigation-playbook)
- [Straightforward Implementation](#straightforward-implementation)
- [Success Criteria](#success-criteria)
- [Bonus Challenges](#bonus-challenges)
- [Additional Resources](#additional-resources)
- [Related Scenarios](#related-scenarios)

---

## Learning Objectives

By completing this scenario, you will learn:

- How reusable GitHub Actions can become a supply-chain attack surface
- Why mutable action tags (`@v1`) let an attacker force-push malicious code
- How a compromised action steals `GITHUB_TOKEN`, secrets, and build artifacts
- How to detect workflow injection in CI/CD pipelines
- How to harden workflows with SHA pinning, least-privilege permissions, and runner isolation

## Background

**GitHub Actions workflow injection** occurs when an attacker compromises a reusable workflow or action that a victim pipeline trusts. The attacker can:

- Force-push a malicious version to a mutable tag
- Read repository and organization secrets available to the job
- Exfiltrate `GITHUB_TOKEN` and build artifacts
- Modify later pipeline steps or published artifacts

### Why It Is Dangerous

- **High privileges**: CI jobs often receive `GITHUB_TOKEN` and cloud credentials
- **Wide impact**: One compromised reusable action can affect every repository that calls it
- **Stealth**: The malicious step runs inside a trusted CI context
- **Persistence**: The attacker controls the action repository and can update the payload repeatedly

### Real-World Examples

- **Codecov (2021)**: A modified CI bash uploader harvested environment variables from thousands of pipelines.
- **SolarWinds (2020)**: Build tooling was compromised and malicious code was inserted into shipped updates.
- **Trivy action campaign (2026)**: A force-pushed tag on a popular security action stole CI secrets before the legitimate scan ran (see Scenario 23).

## Scenario Description

A development team references a reusable action in their build workflow:

```yaml
- uses: vendor/build-action@v1
```

An attacker compromises the `vendor/build-action` repository and force-pushes a malicious version to the `v1` tag. When the victim's CI runs, the action:

1. Collects `GITHUB_TOKEN` and environment secrets
2. Reads the build artifact
3. POSTs the harvested data to an attacker-controlled endpoint

In this lab the endpoint is a mock server on `127.0.0.1:3000` and the payload is gated by `TESTBENCH_MODE=enabled`.

You will:

1. Review the victim workflow and the compromised action
2. Run `build.yml` locally (act when installed, otherwise `npm run ci`)
3. Verify the captured data
4. Detect the workflow injection
5. Apply mitigation controls

## Setup

```bash
cd scenarios/05-build-compromise
export TESTBENCH_MODE=enabled
./setup.sh
```

`setup.sh` creates `victim-app/`, `malicious-action/`, `infrastructure/mock-server.js`, `detection-tools/workflow-injection-scanner.js`, and a lookalike secrets file. When setup finishes, it prints the same numbered flow as **Run the lab** below.

## Run the Lab

Use two terminals (or background the mock server). All paths are relative to `scenarios/05-build-compromise`.

### Terminal A - mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B - run the compromised workflow

```bash
export TESTBENCH_MODE=enabled
./run-ci.sh
```

`run-ci.sh` sources `victim-app/.env.lab` and prefers [nektos/act](https://github.com/nektos/act). Before act's own log, the command prints an `SCAS runner` banner: the workflow file, each `uses:` ref, and the folder that ref is bound to. `vendor/build-action@v1` maps to `malicious-action/`. SHA-pinned `actions/checkout` and `actions/setup-node` map to local no-op stubs so act never talks to GitHub. Docker is not required. If act is missing, the banner says `Node simulator` and you get `npm run ci`, which does not execute `build.yml`.

Do not push this workflow to a real GitHub repo.

To force the Node stand-in: `SCAS_SKIP_ACT=1 ./run-ci.sh`.

### Verify capture

```bash
curl -s http://127.0.0.1:3000/captured-data
```

### Blue team (optional)

From the scenario root:

```bash
node detection-tools/workflow-injection-scanner.js victim-app
```

## Lab Tasks

### Part 1: Understand the Victim Workflow (15 minutes)

Review the workflow file:

```bash
cat victim-app/.github/workflows/build.yml
```

Look for:

- A third-party action referenced by a mutable tag (`@v1`)
- Repository secrets passed into the action's `env` block
- Broad job permissions

### Part 2: Inspect the Compromised Action (15 minutes)

Review the action metadata and entrypoint:

```bash
cat malicious-action/action.yml
cat malicious-action/index.js
```

Note how the payload is gated on `TESTBENCH_MODE=enabled` and exfiltrates only to `127.0.0.1:3000`.

### Part 3: Simulate the Attack (20 minutes)

Run the workflow:

```bash
export TESTBENCH_MODE=enabled
./run-ci.sh
```

What happens:

- The pipeline builds the application
- The compromised action runs during the "Publish artifact" step
- `GITHUB_TOKEN`, AWS credentials, and the database password are harvested
- The build artifact is read and hashed
- A JSON payload is POSTed to `127.0.0.1:3000/collect`

### Part 4: Verify Exfiltration (10 minutes)

```bash
curl -s http://127.0.0.1:3000/captured-data
```

Inspect the captured JSON. You should see the redacted secrets, repository metadata, artifact preview, and SHA-256 hash.

### Part 5: Detection (20 minutes)

Run the scanner:

```bash
node detection-tools/workflow-injection-scanner.js victim-app
```

It flags:

- Mutable action tags
- Secret references in workflow `env` blocks
- Action code that accesses `process.env` and makes HTTP requests

Also look for these IOCs in your SIEM:

- `GITHUB_TOKEN` accessed by a step that does not need it
- Outbound HTTP from a build step to an unexpected IP or domain
- Unexpected `git push --force` events on action repositories

### Part 6: Prevention and Mitigation (20 minutes)

Apply the controls in the [Mitigation Playbook](#mitigation-playbook) and [Straightforward Implementation](#straightforward-implementation) sections.

## Mitigation Playbook

- Pin every third-party action to an immutable commit SHA and verify it with an allowlist check.
- Set the minimum `permissions` on each workflow job and avoid granting `contents: write` when only read is needed.
- Do not pass repository secrets into third-party or reusable actions unless absolutely necessary; prefer OIDC and short-lived tokens.
- Protect reusable workflows and actions with branch rules, tag protection, CODEOWNERS, and signed tags.
- Monitor CI runner process trees and egress for unexpected secret access or outbound connections.
- Require security review of every workflow diff, especially new `uses` lines and mutable tag changes.
- Rotate CI secrets and revoke `GITHUB_TOKEN` after any suspected workflow injection incident.

## Straightforward Implementation

### 1. Prevention config

Replace mutable tags with SHA-pinned references and tighten permissions:

```yaml
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
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. CI gate

Fail the build if a workflow uses a mutable tag:

```yaml
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
```

Or use a policy tool such as `step-security/harden-runner` or Allstar to enforce SHA pinning.

### 3. Detection rule location

Deploy the Sigma rule from `DETECT.md` to your SIEM under the supply-chain detection folder. Alert on:

- A CI step that reads `GITHUB_TOKEN` and then makes an outbound HTTP request
- `process.env` enumeration inside an action entrypoint
- New `uses` references or tag changes in workflow pull requests

### 4. Incident response

```bash
# 1. Stop current runs and remove the malicious action reference
# 2. Rotate all secrets the workflow could access
gh workflow disable build.yml
gh secret set AWS_ACCESS_KEY_ID --body "<new-key>"
# 3. Pin to the last known-good SHA
sed -i 's/vendor\/build-action@v1/vendor\/build-action@<clean-sha>/' .github/workflows/build.yml
# 4. Audit recent runs for unexpected egress or artifact changes
```

## Success Criteria

You have completed this scenario when you can:

- Explain how a force-pushed action tag compromises every consumer
- Simulate the attack and observe captured secrets and artifacts
- Detect mutable tags, secret exposure, and suspicious action code
- Rewrite the workflow to use SHA pinning and least-privilege permissions
- List the incident response steps for a compromised reusable action

## Bonus Challenges

1. **Artifact signing**: Add a step that signs `dist/app.js` with `cosign` and verifies the signature before deployment.
2. **Runner hardening**: Use `step-security/harden-runner` to block unexpected egress from the build job.
3. **Action allowlist**: Configure a GitHub organization policy that only permits actions from trusted owners.
4. **Reusable workflow provenance**: Generate SLSA provenance for the build and compare artifact hashes.
5. **Detection engineering**: Write a Sigma rule that fires when a GitHub Actions step accesses `GITHUB_TOKEN` and then calls an external IP.

## Additional Resources

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [OWASP CI/CD Security](https://owasp.org/www-project-cicd-security/)
- [CISA Secure Software Development](https://www.cisa.gov/secure-software-development)

## Related Scenarios

- **Scenario 23**: Trivy supply-chain attack - another force-pushed GitHub Action tag
- **Scenario 1**: Typosquatting - malicious package names
- **Scenario 4**: Malicious update - compromised dependency updates

---

Complete: you have seen how a trusted CI action can become a supply-chain payload.
