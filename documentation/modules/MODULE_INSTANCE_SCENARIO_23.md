# Module Instance: Scenario 23 (Trivy Supply Chain Attack — CVE-2026-33634)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario demonstrates a **force-push tag attack** against a widely-trusted security tool (Trivy), simulating the CVE-2026-33634 / TeamPCP campaign (March 2026). The attack vector is a compromised GitHub Actions action that harvests CI secrets before running its legitimate scan. Exfiltration goes to **127.0.0.1:3023** only.

## 1) Module Card

- **Module ID**: `23`
- **Title**: `Trivy Supply Chain Attack (CVE-2026-33634 simulation)`
- **Level**: `Advanced`
- **Estimated Time**: `60–90 minutes`
- **Primary Attack Surface**: `GitHub Actions CI/CD pipelines, mutable version tags, security tool trust`
- **Prerequisites**: Node.js 16+; basic understanding of GitHub Actions and CI/CD pipelines

## 2) Learning Objectives

- Explain how a `pull_request_target` misconfiguration enables PAT theft (initial access vector).
- Demonstrate that mutable git tags (`@v0.34.2`) can be silently rewritten via force-push.
- Observe credential harvesting executing *before* the legitimate scan step — invisible in normal CI logs.
- Run `trivy-version-scanner.js` and `ci-workflow-auditor.js` to identify compromised references.
- Apply SHA pinning and `step-security/harden-runner` egress controls as layered defenses.

## 3) Threat Model Snapshot

- **Asset at risk**: CI/CD secrets — GitHub tokens, cloud provider keys, registry credentials, database URLs
- **Trust edge abused**: GitHub Actions version tags as a fixed reference for external action code
- **Attacker objective**: harvest credentials from every pipeline that uses the compromised action
- **Blast radius**: all organizations running `trivy-action@v0.34.x` between March 19–22, 2026

## 4) Lab Setup

```bash
cd scenarios/23-trivy-supply-chain-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

Instructor run order:

```bash
# Terminal A — mock C2 server
node infrastructure/mock-c2-server.js

# Terminal B — victim CI pipeline
cd victim-ci
export TESTBENCH_MODE=enabled
export GITHUB_TOKEN=ghp_FAKE_FOR_LAB   # optional: makes harvest more illustrative
node run-pipeline.js

# Verify capture
curl -s http://127.0.0.1:3023/captured-data

# Detection tools
cd ..
node detection-tools/trivy-version-scanner.js victim-ci
node detection-tools/ci-workflow-auditor.js victim-ci
```

## 5) Attack Walkthrough

1. **Setup**: `./setup.sh` installs `trivy-action-like@0.69.4` (the compromised module) into `victim-ci/node_modules`.
2. **Pipeline run**: `node run-pipeline.js` simulates a four-step GitHub Actions pipeline.
3. **Harvest**: When Step 3 loads `require('trivy-action-like')`, the malicious `harvestAndExfiltrate()` runs — POSTing all CI env vars to the mock C2 server.
4. **Legitimate output preserved**: `scanTarget()` runs normally afterward — the developer sees no anomaly.
5. **Exfil evidence**: `curl http://127.0.0.1:3023/captured-data` shows the stolen credential bundle.

## 6) Detection Playbook

- **Static checks**: search all workflow YAML files for `trivy-action@v0.34` and Docker configs for `trivy:0.69.4/5/6`.
- **Structural checks**: `ci-workflow-auditor.js` flags `WF-01` (pull_request_target risk), `WF-02` (mutable tag), `WF-05` (known compromised version).
- **Behavioral checks**: network connections to `scan.aquasecurtiy.org` (typosquatted domain); unexpected POST traffic from build agents.
- **GitHub audit logs**: look for force-push events on `aquasecurity/trivy-action` tags; unexpected `tpcp-docs` repository creation.

```bash
node detection-tools/trivy-version-scanner.js victim-ci
node detection-tools/ci-workflow-auditor.js victim-ci
```

## 7) Mitigation Playbook

- Pin all GitHub Actions to full commit SHAs — never mutable version tags.
- Update to `trivy-action@v0.35.0+` (pinned SHA) and `setup-trivy@v0.2.6+`.
- Rotate all CI secrets exposed to pipelines after March 19 2026.
- Add `step-security/harden-runner` with `egress-policy: audit` (or `block`) to detect/prevent unexpected network calls.
- Implement org-wide action pinning policy (Allstar, custom CI lint, or `pre-commit` hook).

## 8) Validation Checklist (Success Criteria)

- [ ] Mock C2 server logs show a capture entry with `event_type: "ci_secret_exfil"`.
- [ ] `trivy-version-scanner.js` reports `[CRITICAL]` for `trivy-action@v0.34.2` in the workflow YAML.
- [ ] `ci-workflow-auditor.js` reports `WF-02` (mutable tag) and `WF-05` (compromised version).
- [ ] Learner can explain why SHA pinning prevents this attack class.
- [ ] Learner can identify which CI secrets would need rotation if this ran in their real pipeline.

## 9) Production Policy Snippet

```bash
# Scan all workflow files in current repo for mutable trivy-action references
grep -r 'trivy-action@v0\.34\.' .github/workflows/

# Or use step-security's actionlint-based checker:
# https://app.stepsecurity.io/secureworkflow
```

```yaml
# Recommended: harden-runner in every workflow
- uses: step-security/harden-runner@<SHA>
  with:
    egress-policy: audit
    allowed-endpoints: |
      api.github.com:443
      registry.npmjs.org:443
```

## 10) Debrief Questions

- Why did the force-push attack succeed even after Aqua Security rotated credentials on March 1?
- What is the difference between `pull_request` and `pull_request_target` in terms of permissions?
- If you were a CISO, how would you prioritize remediating this across 200 workflow files in 50 repositories?
- Beyond SHA pinning, what organizational controls could have detected this attack earlier?
