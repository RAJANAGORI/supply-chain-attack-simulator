# Scenario 25: Compromised Reusable GitHub Action








## Table of Contents

<div class="doc-toc">

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Scenario Description](#scenario-description)
- [Setup](#setup)
- [Run the Lab](#run-the-lab)
- [Lab Tasks](#lab-tasks)
- [Detection Checklist](#detection-checklist)
- [Mitigation Playbook](#mitigation-playbook)
- [Straightforward Implementation](#straightforward-implementation)
- [References](#references)
- [Cleanup](#cleanup)

</div>

---
## Learning Objectives

By completing this scenario, you will learn:

- How force-pushing a mutable action tag can compromise every CI pipeline that uses it.
- Why reusable actions are a high-trust supply-chain target.
- How to detect malicious action references in workflow files.
- How to harden CI/CD against reusable-action compromise.

## Background

Reusable GitHub Actions are one of the most trusted pieces of CI/CD infrastructure. A workflow line like `uses: example/actions/checkout@v3` tells GitHub to download and run code from another repository. If an attacker compromises the maintainer account for that action, they can force-push the mutable `v3` tag to a malicious commit. Every pipeline that references the tag will run the attacker's code on the next execution.

### Why mutable tags are dangerous

- Tags and floating major-version branches (`@v3`) can be moved to any commit.
- Pipelines usually resolve the tag at runtime, so the compromise is immediate and global.
- Commit SHAs are immutable, so pinning to a SHA prevents tag-movement attacks.
- Third-party actions often run with access to `GITHUB_TOKEN`, secrets, and the repository checkout.

### Real-world parallels

- Scenario 23 covers the 2026 Trivy action compromise (CVE-2026-33634).
- This scenario generalizes the same attack pattern to any popular reusable action.

## Scenario Description

Your organization uses `example/actions/checkout@v3` in every workflow. An attacker phishes the action maintainer, gains publish access, and force-pushes the `v3` tag to a malicious commit. The next CI run executes the backdoored action, which harvests `GITHUB_TOKEN` and repository secrets and exfiltrates them to an attacker-controlled host.

In this lab you will:

1. Play the attacker: examine the force-pushed malicious action.
2. Play the victim: run `ci.yml` locally (act when installed, otherwise `npm start`).
3. Play the defender: detect the malicious reference and replace it with a pinned SHA.

## Setup

### Prerequisites

- Node.js 16+ and npm.
- Optional: [nektos/act](https://github.com/nektos/act) (`brew install act`) so `./run-ci.sh` executes `ci.yml` instead of the Node stand-in. Docker is not required. The command prints an `SCAS runner` banner first: `example/actions/checkout@v3` is bound to `victim-app/.github/actions/checkout`, and act never fetches from GitHub. If the banner says `Node simulator`, `ci.yml` did not run.

### Environment setup

```bash
cd scenarios/25-compromised-github-action
export TESTBENCH_MODE=enabled
./setup.sh
```

`setup.sh` sources the shared testbench, resets `infrastructure/captured-data.json`, and plants lookalike CI secrets in `.env.ci-lab`.

## Run the Lab

Use two terminals. All paths are relative to `scenarios/25-compromised-github-action`.

### Terminal A - Mock attacker server

```bash
node infrastructure/mock-server.js
```

Leave this running. It listens on `127.0.0.1:3025` and logs every exfiltration attempt.

### Terminal B - Run the compromised workflow

```bash
export TESTBENCH_MODE=enabled
./run-ci.sh
```

`run-ci.sh` sources `.env.ci-lab` and prefers act. Before act's own log it prints an `SCAS runner` banner with the workflow file and the folder each `uses:` ref is bound to. The workflow file still says `uses: example/actions/checkout@v3`. act resolves that ref to `victim-app/.github/actions/checkout` and runs `index.js` as a `node20` action. If act is missing or the run fails, the banner says `Node simulator` and the same payload is loaded with `npm start`, which does not execute `ci.yml`.

Do not push this workflow to a real GitHub repo. Local act is the point.

To force the Node stand-in: `SCAS_SKIP_ACT=1 ./run-ci.sh`.

### Verify capture

```bash
curl -s http://127.0.0.1:3025/captured-data
```

Clear captured data between runs:

```bash
curl -X DELETE http://127.0.0.1:3025/captured-data
```

### Blue team detection

From the scenario root:

```bash
node detection-tools/action-compromise-detector.js victim-app
```

## Lab Tasks

### Part 1: Understand the attack (15 minutes)

1. Read `victim-app/.github/workflows/ci.yml` and find the compromised reference.
2. Open `victim-app/.github/actions/checkout/index.js` and identify the exfiltration code.
3. Compare the malicious action to a normal checkout action.

**Questions:**

- What is force-pushing and why does it work against version tags?
- Which CI secrets does the action collect?
- Why does the pipeline still appear to succeed?

### Part 2: Run the attack (15 minutes)

1. Start the mock server in Terminal A.
2. Run `./run-ci.sh` in Terminal B (after sourcing is handled by the script).
3. Verify that secrets were captured at `http://127.0.0.1:3025/captured-data`.

**Questions:**

- At what step does the exfiltration occur?
- What would the real exfiltration destination look like?

### Part 3: Detection (20 minutes)

1. Run `action-compromise-detector.js` against `victim-app`.
2. Review every finding and map it to a workflow line.
3. Read `DETECT.md` for the full detection runbook.

**Questions:**

- Which detector check catches the force-pushed tag?
- What would a GitHub audit log show for the tag update?

### Part 4: Hardening and prevention (20 minutes)

1. Edit `victim-app/.github/workflows/ci.yml` to use the commented-out safe SHA reference.
2. Re-run `action-compromise-detector.js` and confirm the findings are cleared.
3. Draft an internal policy requiring SHA pinning for all third-party actions.

**Questions:**

- Why does a commit SHA prevent force-push attacks?
- How does `step-security/harden-runner` complement SHA pinning?
- What secrets would you rotate after a confirmed action compromise?

## Detection Checklist

- [ ] Search all `.github/workflows/*.yml` files for `example/actions/checkout@v3`.
- [ ] Search for any third-party action reference that uses a mutable tag (`@vN` or `@vN.N.N`).
- [ ] Review GitHub organization audit logs for unexpected tag force-pushes.
- [ ] Inspect CI runner logs for unexpected outbound network connections.
- [ ] Check `~/.ssh/id_rsa`, `~/.aws/credentials`, `~/.kube/config`, and `~/.docker/config.json` access.
- [ ] Rotate all secrets accessible to pipelines that ran the compromised action.
- [ ] Mock capture evidence at `infrastructure/captured-data.json` with `ci_secret_exfil` event type.

## Mitigation Playbook

- Pin every reusable action to an immutable commit SHA, never a mutable tag.
- Audit workflow files for tag references and enforce SHA pinning via CI lint or policy.
- Apply least-privilege permissions and avoid passing secrets to third-party actions as environment variables.
- Monitor CI runners for unexpected outbound network calls.
- Rotate CI secrets immediately when a reusable action compromise is reported or suspected.
- Use tools like `step-security/harden-runner` to block unexpected egress from action steps.

## Straightforward Implementation

### 1. Pin actions by SHA

```yaml
# .github/workflows/ci.yml
- name: Checkout
  uses: example/actions/checkout@a1b2c3d4e5f6789012345678901234567890abcd
```

### 2. Audit workflow files

```bash
grep -R "uses:.*@v" .github/workflows/ && exit 1
```

### 3. Harden runner

```yaml
- uses: step-security/harden-runner@<full-sha>
  with:
    egress-policy: block
    allowed-endpoints: |
      github.com:443
      registry.npmjs.org:443
```

### 4. Credential rotation

```bash
# Rotate all secrets accessible to affected pipeline runs
gh secret set GITHUB_TOKEN --repo org/repo --body "..."
aws iam create-access-key --user-name ci-user
# Update any database, registry, or cloud credentials the action could reach
```

## References

- [GitHub Actions: Using commit SHAs for third-party actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
- [step-security/harden-runner](https://github.com/step-security/harden-runner)
- [Scenario 23: Trivy Supply Chain Attack](../23-trivy-supply-chain-attack/README.md)
- [Scenario 05: GitHub Actions workflow injection](../05-build-compromise/README.md) (same `run-act.sh` helper)

## Cleanup

```bash
cd scenarios/25-compromised-github-action
rm -f .env.ci-lab
rm -f infrastructure/captured-data.json
```
