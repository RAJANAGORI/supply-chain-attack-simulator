# Scenario 23: Trivy Supply Chain Attack (CVE-2026-33634)



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
- [References](#references)
- [Cleanup](#cleanup)

</div>

---
## Learning Objectives

By completing this scenario, you will learn:

- How attackers compromise developer security tools through credential theft
- How incomplete credential rotation enables persistent access to a repository
- The mechanics of force-pushing malicious commits to existing version tags
- How CI/CD pipelines are infected through trusted security tools
- Techniques to detect and respond to security tool supply chain attacks
- Hardening strategies including SHA pinning and runtime network monitoring

---

## Background

**CVE-2026-33634** represents one of the most significant supply chain attacks in recent history. In March 2026, a financially motivated threat group known as **TeamPCP** compromised Aqua Security's Trivy vulnerability scanner — a tool trusted by thousands of organizations to *find* vulnerabilities in their code and containers.

### The Attack Timeline

| Date | Event |
|:-----|:------|
| **Late February 2026** | Attackers exploited a misconfigured `pull_request_target` workflow in Trivy's own GitHub repo to steal a high-privilege Personal Access Token (PAT). |
| **March 1, 2026** | Aqua Security detected the breach and rotated credentials — but the rotation was **not atomic**: not all tokens were revoked simultaneously, leaving a window. |
| **March 19, 2026** | Using still-valid credentials, attackers: (1) published malicious **Trivy v0.69.4** release, (2) force-pushed **76 of 77** version tags in `aquasecurity/trivy-action` to credential-stealing commits, (3) replaced **all 7** tags in `aquasecurity/setup-trivy` with malicious commits. |
| **March 22, 2026** | Attackers published malicious Docker images **v0.69.5** and **v0.69.6** on Docker Hub, GHCR, and ECR. |

### What Made This Attack Unique

1. **Trusted tool as attack vector** — Trivy is a *security scanner*; organizations trusted it to find threats, not *be* one.
2. **Force-push technique** — Overwriting existing tags rather than creating new releases avoids most notification triggers.
3. **Cascading impact** — The same TeamPCP campaign later compromised Checkmarx KICS and BerriAI's LiteLLM.
4. **Multiple distribution channels** — GitHub Releases, Docker Hub (`docker.io/aquasec/trivy`), GHCR, and ECR were all affected.

### The Malicious Payload

The injected malware was a **credential harvester** that:

- Scanned environment variables, SSH keys, cloud provider credentials, Kubernetes tokens, Docker configs, and database passwords
- Exfiltrated data to the typosquatted domain `scan.aquasecurtiy[.]org` (note missing `s`)
- Created public repositories named `tpcp-docs` as a backup exfiltration channel
- Installed persistent Python backdoors (`/tmp/.cache/pybin/`) on compromised machines

---

## Scenario Description

You are a security engineer at a mid-sized SaaS company. Your CI/CD pipelines use Trivy for container vulnerability scanning. One Monday morning you receive a security advisory about CVE-2026-33634 and need to:

- **Attacker role**: Examine how the force-push attack was executed
- **Victim role**: Understand how the malicious action harvested CI secrets
- **Defender role**: Run detection tooling and implement mitigations

---

## Setup

### Prerequisites

- Node.js 16+ and npm

### Environment Setup

```bash
cd scenarios/23-trivy-supply-chain-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

`setup.sh` resets `infrastructure/captured-data.json`, installs victim-ci dependencies (which pulls in the simulated malicious `trivy-action-like@0.69.4`), and prints next steps.

---

## Run the Lab

Use two terminals. All paths are relative to `scenarios/23-trivy-supply-chain-attack`.

### Terminal A — Mock C2 Server

```bash
node infrastructure/mock-c2-server.js
```

Leave this running. It listens on `localhost:3023` and logs every exfiltration attempt.

### Terminal B — Simulate the Attack

```bash
export TESTBENCH_MODE=enabled

# 1. Review the clean scanner (the attacker's starting point)
node legitimate/trivy-scanner/index.js

# 2. Run the victim CI pipeline — watch the malicious action exfiltrate secrets
cd victim-ci
node run-pipeline.js
cd ..

# 3. Verify the exfil occurred
curl -s http://127.0.0.1:3023/captured-data | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('Captures:', d.captures.length);
  d.captures.forEach((c,i) => console.log(i+1, JSON.stringify(c.data, null, 2)));
"
```

### Optionally set fake CI secrets to make the harvest more realistic

```bash
export GITHUB_TOKEN=ghp_FAKE_TOKEN_FOR_LAB_ONLY
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export GITHUB_REPOSITORY=acme-corp/payments-api
cd victim-ci && node run-pipeline.js
```

### Verify and Clear Captures

```bash
# View
curl -s http://127.0.0.1:3023/captured-data

# Clear between runs
curl -X DELETE http://127.0.0.1:3023/captured-data
```

### Blue Team Detection

```bash
# Scan victim CI for compromised version references
node detection-tools/trivy-version-scanner.js victim-ci

# Audit GitHub Actions workflow files for security misconfigurations
node detection-tools/ci-workflow-auditor.js victim-ci
```

---

## Lab Tasks

### Part 1: Understanding the Attack (20 minutes)

**Tasks:**
- Compare `legitimate/trivy-scanner/index.js` with `malicious-trivy/v0.69.4/trivy-action-like.js`
- Review the reference CI workflow at `victim-ci/.github/workflows/ci.yml`

**Questions:**
- How did the attackers initially gain access to Trivy's repository?
- Why was the March 1 credential rotation insufficient?
- What is force-pushing and why is it dangerous for version tags?
- Why are security tools particularly attractive supply chain targets?

### Part 2: Simulating the Attack (25 minutes)

**Tasks:**
- Run the victim CI pipeline with `TESTBENCH_MODE=enabled`
- Observe the exfiltration in Terminal A
- Set environment variables to simulate real CI secrets and re-run

**Questions:**
- Which environment variables were harvested in your run?
- What does the pipeline output show to an unsuspecting developer?
- What makes this attack hard to notice in normal CI logs?

### Part 3: Detection and Response (25 minutes)

**Tasks:**
- Run `trivy-version-scanner.js` on the victim CI directory
- Run `ci-workflow-auditor.js` and review each finding
- Read through `DETECT.md` for the full detection runbook

**Questions:**
- Which `WF-0x` check identifies the initial access vector used by TeamPCP?
- What does a force-pushed tag look like in GitHub's audit log vs. a normal release?
- How would you determine if your organization ran affected pipelines between March 19–22?

### Part 4: Hardening and Prevention (20 minutes)

**Tasks:**
- Edit `victim-ci/.github/workflows/ci.yml` to use the commented-out safe SHA reference
- Re-run `ci-workflow-auditor.js` and verify `WF-02` and `WF-05` are cleared

**Questions:**
- Why does pinning to a commit SHA prevent force-push attacks?
- What is `step-security/harden-runner` and how does it complement SHA pinning?
- What changes to the credential rotation process on March 1 could have prevented the March 19 attack?

---

## Detection Checklist

Use this checklist to determine if your organization was affected:

- [ ] Search all `.yml`/`.yaml` workflow files for `trivy-action@v0.34` and `setup-trivy@v0.2.5` (or earlier)
- [ ] Check Docker configs for `aquasec/trivy:0.69.4`, `0.69.5`, or `0.69.6`
- [ ] Inspect GitHub organization audit logs for unexpected `tpcp-docs` repository creation
- [ ] Review pipeline logs from **March 19–22, 2026** for unexpected network connections
- [ ] Check for `~/.ssh/id_rsa`, `~/.aws/credentials`, `~/.kube/config` access in process logs
- [ ] Rotate all secrets that were accessible to pipelines running in that window

---

## Mitigation Playbook

- Contain: disable and re-queue all pipelines that ran `trivy-action@v0.34.x` or `setup-trivy@v0.2.5` or earlier after March 19 2026.
- Eradicate: replace every mutable tag reference with an immutable commit SHA (`aquasecurity/trivy-action@<SHA>`).
- Recover: rotate all CI secrets (GITHUB_TOKEN, AWS keys, registry credentials, database URLs) accessible to affected pipeline runs.
- Hunt: scan every workflow YAML in the organization for compromised version strings; check Dockerfiles and container registries for `trivy:0.69.4/5/6`.
- Harden: enforce SHA pinning for all third-party actions via policy (e.g. `step-security/harden-runner`, Allstar, or custom CI lint); alert on unexpected outbound network calls from action steps.

---

## References

- [CVE-2026-33634 — NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-33634)
- [GitHub Security Advisory GHSA-69fq-xp46-6x23](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23)
- [Aqua Security CVE-2026-33634 Announcement](https://blog.aquasecurity.io)
- [step-security/harden-runner](https://github.com/step-security/harden-runner) — blocks unexpected network calls from actions
- [SLSA Framework](https://slsa.dev) — supply-chain levels for software artifacts

---

## Cleanup

```bash
cd scenarios/23-trivy-supply-chain-attack
./clean.sh
```
