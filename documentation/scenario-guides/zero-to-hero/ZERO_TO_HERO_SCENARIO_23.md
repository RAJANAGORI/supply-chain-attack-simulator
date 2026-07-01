# 🚀 Zero to Hero: Scenario 23 - Trivy Supply Chain Attack (CVE-2026-33634)

Welcome! This guide will take you from zero knowledge to successfully completing the Trivy supply chain attack scenario. We'll go step by step, explaining everything along the way.

**Note**: This lab uses a **fictional** `trivy-action-like` module and **127.0.0.1:3023** HTTP only. It models the CVE-2026-33634 attack pattern (TeamPCP / March 2026) — no real credentials are stolen and no external network calls are made.

## 📚 What You'll Learn

By the end of this guide, you will:
- Understand how a trusted security tool (Trivy) was weaponized via a force-push tag attack
- See how incomplete credential rotation enables persistent attacker access
- Execute a CI pipeline simulation that harvests and exfiltrates fake CI secrets
- Run two detection tools (version scanner + workflow auditor) against compromised configs
- Apply SHA pinning and runtime network monitoring to prevent this class of attack
- Perform incident response steps: contain, eradicate, recover, rotate

- Apply the **Mitigation Playbook** from this guide and the scenario README
---





## Table of Contents

<div class="doc-toc">

- [Part 1: Understanding the Attack (15 minutes)](#part-1-understanding-the-attack-15-minutes)
- [Part 2: Prerequisites Check (5 minutes)](#part-2-prerequisites-check-5-minutes)
- [Part 3: Setting Up Scenario 23 (10 minutes)](#part-3-setting-up-scenario-23-10-minutes)
- [Part 4: Understanding the File Structure (15 minutes)](#part-4-understanding-the-file-structure-15-minutes)
- [Part 5: The Attack — CI Secret Exfiltration (30 minutes)](#part-5-the-attack--ci-secret-exfiltration-30-minutes)
- [Part 6: Detection Methods (30 minutes)](#part-6-detection-methods-30-minutes)
- [Part 7: Forensic Investigation (20 minutes)](#part-7-forensic-investigation-20-minutes)
- [Part 8: Incident Response and Mitigation (25 minutes)](#part-8-incident-response-and-mitigation-25-minutes)
- [Mitigation Playbook](#mitigation-playbook)
- [Elasticsearch + Kibana observability (optional)](#elasticsearch--kibana-observability-optional)
- [Part 9: Key Takeaways](#part-9-key-takeaways)
- [Part 10: Advanced Exercises](#part-10-advanced-exercises)
- [📚 Additional Resources](#📚-additional-resources)
- [⚠️ Safety & Ethics](#⚠️-safety--ethics)

</div>

---
## Part 1: Understanding the Attack (15 minutes)

### The CVE-2026-33634 Campaign at a Glance

In March 2026, a threat group known as **TeamPCP** compromised Aqua Security's **Trivy** — one of the most widely used open-source vulnerability scanners. The attack is notable because it targeted a *security tool*, turning defenders' own tooling against them.

### The Two-Phase Attack

**Phase 1 — Initial Access (Late February 2026)**

Trivy's own GitHub repository had a misconfigured `pull_request_target` workflow. This event type runs with **write permissions** even when triggered by a fork PR. Combined with an `actions/checkout` step that checked out the PR's code, it allowed an attacker to:

1. Submit a PR from a fork containing a malicious workflow step
2. The workflow ran with full repo write access
3. The malicious step exfiltrated a high-privilege Personal Access Token (PAT)

This is workflow check `WF-01` in the lab's `ci-workflow-auditor.js`.

**Phase 2 — Weaponization (March 19, 2026)**

Aqua Security rotated credentials on March 1 — but not all tokens at once. TeamPCP used still-valid credentials 18 days later to:

- Force-push **76 of 77** version tags in `aquasecurity/trivy-action` to malicious commits
- Replace **all 7** tags in `aquasecurity/setup-trivy` with malicious commits
- Publish malicious `trivy:0.69.4` binary release

On March 22, they also published malicious Docker images `trivy:0.69.5` and `trivy:0.69.6`.

### Why Force-Pushing Tags Is So Dangerous

A version tag like `v0.34.2` is **mutable** by default in Git. Any repo maintainer (or attacker with write access) can run:

```bash
git tag -f v0.34.2 <malicious-commit-sha>
git push origin v0.34.2 --force
```

After this, every CI pipeline that pins `uses: aquasecurity/trivy-action@v0.34.2` will silently download and execute the malicious code — **without any PR, review, or diff visible to the victim**.

### The Malicious Payload

The injected infostealer harvested:

| Target | What was collected |
|--------|-------------------|
| Environment variables | `GITHUB_TOKEN`, `AWS_*`, `DATABASE_*`, API keys |
| SSH keys | `~/.ssh/id_rsa` |
| Cloud credentials | `~/.aws/credentials` |
| Kubernetes config | `~/.kube/config` |
| Docker config | `~/.docker/config.json` |

Data was exfiltrated to `scan.aquasecurtiy[.]org` — a typosquatted domain (missing the second `s` in `security`). A backup channel created public GitHub repos named `tpcp-docs`.

### Attack Flow Diagram

```
Trivy repo's pull_request_target workflow (misconfigured)
    │
    └─▶ TeamPCP steals PAT via malicious PR (Late Feb 2026)
            │
            └─▶ Aqua rotates credentials on March 1 (non-atomic — window remains)
                    │
                    └─▶ March 19: TeamPCP force-pushes 76 tags in trivy-action
                            │
                            └─▶ Every org running trivy-action@v0.34.2 in CI
                                    │
                                    └─▶ malicious Node.js payload runs BEFORE scan
                                            │
                                            └─▶ POST https://scan.aquasecurtiy.org/collect
                                                    (all CI secrets: tokens, keys, passwords)
```

In this lab: `POST http://127.0.0.1:3023/collect` (safe, localhost only).

---
## Part 2: Prerequisites Check (5 minutes)

```bash
node --version   # Should be 16+
npm --version    # Any recent version
```

If Node.js is not installed, download it from [nodejs.org](https://nodejs.org).

---
## Part 3: Setting Up Scenario 23 (10 minutes)

```bash
cd scenarios/23-trivy-supply-chain-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

The setup script:
- Resets `infrastructure/captured-data.json` to an empty capture log
- Runs `npm install` in `victim-ci/` to install the simulated `trivy-action-like@0.69.4` package

**What the `npm install` step does:**

The `victim-ci/package.json` has a local `file:` dependency:

```json
"trivy-action-like": "file:../malicious-trivy/v0.69.4"
```

This installs the lab's malicious module into `victim-ci/node_modules/`. In the real attack, GitHub Actions runners downloaded the compromised code from `github.com/aquasecurity/trivy-action` at the force-pushed tag.

---
## Part 4: Understanding the File Structure (15 minutes)

```
scenarios/23-trivy-supply-chain-attack/
├── legitimate/trivy-scanner/index.js        ← CLEAN baseline (v0.69.2)
├── malicious-trivy/
│   ├── v0.69.4/trivy-action-like.js         ← COMPROMISED module (main attack vector)
│   ├── v0.69.4/installer.sh                 ← Simulated install narrative
│   ├── v0.69.5/Dockerfile.simulated         ← Compromised Docker image (static artifact)
│   └── v0.69.6/Dockerfile.simulated         ← Compromised Docker image + persistence
├── infrastructure/mock-c2-server.js         ← Attacker C2 (localhost:3023)
├── victim-ci/
│   ├── run-pipeline.js                      ← The CI simulation you will run
│   ├── package.json                         ← Depends on trivy-action-like@0.69.4
│   ├── app/index.js                         ← Dummy application being scanned
│   └── .github/workflows/ci.yml             ← Reference workflow (static artifact)
└── detection-tools/
    ├── trivy-version-scanner.js             ← Finds compromised version references
    └── ci-workflow-auditor.js               ← Checks workflow security misconfigs
```

### Exercise 4a: Compare the clean vs compromised scanner

Open both files and look at the diff:

```bash
diff legitimate/trivy-scanner/index.js malicious-trivy/v0.69.4/trivy-action-like.js
```

**What to observe:**
- The malicious version has an additional `harvestAndExfiltrate()` function
- That function runs **immediately when the module is loaded** via `require()`
- The legitimate `scanTarget()` and `printSummary()` functions are preserved intact — the pipeline output looks normal

---
## Part 5: The Attack — CI Secret Exfiltration (30 minutes)

### Step 5a: Start the Mock C2 Server

**Terminal A:**
```bash
cd scenarios/23-trivy-supply-chain-attack
node infrastructure/mock-c2-server.js
```

Leave this running. It simulates `scan.aquasecurtiy[.]org`.

### Step 5b: Run the Victim CI Pipeline

**Terminal B:**
```bash
cd scenarios/23-trivy-supply-chain-attack/victim-ci
export TESTBENCH_MODE=enabled
node run-pipeline.js
```

Watch Terminal A. You should see the capture log as soon as Step 3 of the pipeline starts — *before* the trivy scan result is printed.

### Step 5c: Make the harvest more realistic

Set fake CI environment variables that would be present in a real pipeline:

```bash
export GITHUB_TOKEN=ghp_FAKE_TOKEN_FOR_LAB_ONLY
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export GITHUB_REPOSITORY=acme-corp/payments-api
export GITHUB_ACTOR=ci-bot
node run-pipeline.js
```

In Terminal A you will now see those values in the captured JSON — exactly what the TeamPCP infostealer sent to their C2 server.

### Step 5d: What the victim sees vs what actually happened

The pipeline output in Terminal B shows all four steps completing successfully:

```
[Step 1/4] actions/checkout@v4
[Step 2/4] Build application
[Step 3/4] aquasecurity/trivy-action@v0.34.2  ← COMPROMISED
[Step 4/4] Build and push Docker image
Pipeline finished.
```

The developer sees a clean build. The secrets are already gone.

### Step 5e: Verify the capture

```bash
curl -s http://127.0.0.1:3023/captured-data
```

Clear between runs:
```bash
curl -X DELETE http://127.0.0.1:3023/captured-data
```

---
## Part 6: Detection Methods (30 minutes)

### Method 1: Version Scanner

Scans file contents for known-compromised version strings and typosquatted domains:

```bash
cd scenarios/23-trivy-supply-chain-attack
node detection-tools/trivy-version-scanner.js victim-ci
```

Expected output includes a `[CRITICAL]` finding on `trivy-action@v0.34.2` in the workflow YAML.

### Method 2: CI Workflow Auditor

Checks GitHub Actions workflows for structural security issues:

```bash
node detection-tools/ci-workflow-auditor.js victim-ci
```

Review each finding:

| Check | Severity | What it catches |
|-------|----------|----------------|
| `WF-01` | CRITICAL | `pull_request_target` + `checkout` (initial attack vector) |
| `WF-02` | HIGH | Mutable tag reference instead of SHA |
| `WF-03` | MEDIUM | Overly broad write permissions |
| `WF-04` | MEDIUM | GITHUB_TOKEN as explicit env var |
| `WF-05` | CRITICAL | Known compromised trivy-action version |

### Method 3: GitHub Audit Log (real incident)

In a real incident, check GitHub organization audit logs for:
- Tag force-push events on `aquasecurity/trivy-action` around March 19, 2026
- Unexpected repository creation events (look for `tpcp-docs`)
- Access from unfamiliar IP addresses to Aqua Security's org

### Method 4: Network Traffic Analysis (real incident)

Look for DNS queries or HTTP connections to:
- `scan.aquasecurtiy.org` (typosquatted — note missing `s`)
- Any `*.aquasecurtiy.org` subdomain

In the lab, the equivalent is a POST to `127.0.0.1:3023`.

---
## Part 7: Forensic Investigation (20 minutes)

### 7a: Examine the captured data

```bash
curl -s http://127.0.0.1:3023/captured-data | python3 -m json.tool
```

Note the fields:
- `event_type: "ci_secret_exfil"` — the IOC signature
- `attack_vector: "force-pushed-tag"` — the delivery mechanism
- `ci_env` — the harvested environment variables
- `filesystem_paths_checked` — what the real payload scanned for on disk
- `real_c2_domain` — the actual typosquatted domain used in the real attack

### 7b: Identify the timeline

If this were a real incident, reconstruct the exposure window:
1. When did your pipelines start using `trivy-action@v0.34.2`?
2. When did you receive the CVE-2026-33634 advisory?
3. All pipeline runs **between those dates** must be treated as compromised

### 7c: Scope the blast radius

Which secrets were accessible to your compromised pipelines?
- All `secrets.GITHUB_TOKEN` with the permissions granted to those workflows
- Any cloud provider credentials injected as environment variables
- Any registry credentials used in `docker push` steps
- Database connection strings in CI environment variables

---
## Part 8: Incident Response and Mitigation (25 minutes)

### 8a: Contain

Stop all pipelines using the compromised action versions. If using GitHub Actions:

```yaml
# Temporarily disable affected workflows by adding:
on: {}  # disables all triggers
```

Or delete the workflow file from the default branch until it is remediated.

### 8b: Eradicate

Replace every mutable tag reference with an immutable commit SHA:

```yaml
# BEFORE (vulnerable — mutable tag)
uses: aquasecurity/trivy-action@v0.34.2

# AFTER (safe — immutable commit SHA)
uses: aquasecurity/trivy-action@6e0878da55e5af17e15be7bdc56434b1a7b1f3d8  # v0.35.0
```

The lab's workflow file at `victim-ci/.github/workflows/ci.yml` shows this remediation commented out. Edit it now to see `WF-02` and `WF-05` clear in the auditor.

### 8c: Recover (rotate secrets)

Rotate every secret that was in scope:

```bash
# GitHub tokens — revoke and reissue via GitHub Settings > Personal Access Tokens
# AWS keys — use IAM to deactivate and create new key pair
# Container registry — regenerate service account credentials
# Database passwords — use your secrets manager to rotate
```

### 8d: Harden with step-security/harden-runner

Add this to every workflow to block unexpected network calls at action runtime:

```yaml
- name: Harden Runner
  uses: step-security/harden-runner@<SHA>
  with:
    egress-policy: audit   # or 'block' once you know your allowlist
    allowed-endpoints: >
      api.github.com:443
      registry.npmjs.org:443
```

With `egress-policy: block`, the trivy-action exfil POST to `scan.aquasecurtiy.org` would have been blocked and alerted.

---

## Mitigation Playbook

Canonical prevention and mitigation controls (aligned with the [scenario README](../../../scenarios/23-trivy-supply-chain-attack/README.md)). Lab walkthroughs above expand each control with hands-on steps.

- Contain: disable and re-queue all pipelines that ran `trivy-action@v0.34.x` or `setup-trivy@v0.2.5` or earlier after March 19 2026.
- Eradicate: replace every mutable tag reference with an immutable commit SHA (`aquasecurity/trivy-action@<SHA>`).
- Recover: rotate all CI secrets (GITHUB_TOKEN, AWS keys, registry credentials, database URLs) accessible to affected pipeline runs.
- Hunt: scan every workflow YAML in the organization for compromised version strings; check Dockerfiles and container registries for `trivy:0.69.4/5/6`.
- Harden: enforce SHA pinning for all third-party actions via policy (e.g. `step-security/harden-runner`, Allstar, or custom CI lint); alert on unexpected outbound network calls from action steps.

---

---

## Elasticsearch + Kibana observability (optional)

Scenario **23 — Trivy Supply Chain Attack (CVE-2026-33634)** is indexed in Elasticsearch when the observability stack is running.

Trivy Supply Chain Attack (CVE-2026-33634): force-pushed trivy-action tag harvests CI secrets before the legitimate scan runs.

- **Detection runbook (static)** → index `scas-rules`, document id `23` — IOCs, Sigma, YARA, sample logs from `DETECT.md`
- **Runtime captures (dynamic)** → index `scas-detections` — one document per exfil event when `SCAS_ES_URL` is set before starting the mock collector

### How to read this diagram

| Phase | What you should look for |
|-------|--------------------------|
| **1 — Collectors** | Terminal A starts the mock server (or harvester). Set `SCAS_ES_URL` here if you want live Elasticsearch indexing. |
| **2 — Lab execution** | Terminal B runs the scenario README steps. Numbered arrows follow the attack path in order. |
| **3 — Exfiltration** | Malicious sample sends **localhost-only** JSON to the mock endpoint. Evidence is always written to `infrastructure/` on disk. |
| **4 — Elasticsearch** | When `SCAS_ES_URL` is set, the same capture is indexed into `scas-detections` with `scenario_id` and `event_type=exfil_capture`. |
| **5 — Kibana** | Use the per-scenario saved searches to compare **runtime captures** (Detections) with the **static runbook** (Rules). |

> **Safety:** All network calls stay on `127.0.0.1`. Malicious logic runs only when `TESTBENCH_MODE=enabled`.

### End-to-end flow

```mermaid
sequenceDiagram
    autonumber
    participant Learner as Learner (you)
    participant Victim as victim-ci
    participant MalPkg as trivy-action-like@0.69.4 (force-pushed tag)
    participant Mock as mock-c2-server.js :3023
    participant ES as Elasticsearch :9200
    participant Kibana as Kibana :5601

    Note over Learner,Mock: Phase 1 — Start collectors (Terminal A)
    Learner->>Mock: export TESTBENCH_MODE=enabled
    Learner->>Mock: export SCAS_ES_URL=http://localhost:9200 (optional)
    Learner->>Mock: node infrastructure/mock-c2-server.js
    Mock->>Mock: Listen for exfil POST on localhost

    Note over Learner,MalPkg: Phase 2 — Run the lab (Terminal B)
    Learner->>Learner: export TESTBENCH_MODE=enabled
    Learner->>Learner: export SCAS_ES_URL=http://localhost:9200 (optional)
    Learner->>C2: node infrastructure/mock-c2-server.js (port 3023)
    Learner->>Victim: cd victim-ci && node run-pipeline.js (TESTBENCH_MODE=enabled)
    Victim->>MalPkg: require("trivy-action-like") triggers harvestAndExfiltrate()
    MalPkg->>C2: POST http://127.0.0.1:3023/collect — CI env vars harvested
    MalPkg->>Victim: scanTarget() runs — pipeline output appears normal

    Note over MalPkg,Mock: Phase 3 — Simulated exfiltration (127.0.0.1 only)
    Note over MalPkg: Malicious path gated by TESTBENCH_MODE=enabled
    MalPkg->>Mock: POST /collect JSON payload
    Mock->>Mock: Append to infrastructure/captured-data.json
    Mock-->>Learner: 200 OK (capture accepted)

    Note over Mock,Kibana: Phase 4 — Optional Elasticsearch indexing
    alt SCAS_ES_URL is set in Terminal A
    Mock->>ES: POST scas-detections (scenario_id=23, event_type=exfil_capture)
    ES->>ES: Store @timestamp, package, detail fields
    else SCAS_ES_URL not set
    Mock->>Mock: File-only capture (default lab behavior)
    end

    Note over ES: Runbook pre-seeded at scas-rules/_doc/23
    Note over Learner,Kibana: Phase 5 — Blue-team review in Kibana
    Learner->>Kibana: Open Discover → SCAS Detections — Scenario 23
    Kibana->>ES: Query scenario_id + sort by @timestamp desc
    ES-->>Kibana: Return capture events for this lab
    Learner->>Kibana: Open SCAS Rules — Scenario 23
    ES-->>Kibana: Return IOCs, Sigma, YARA from DETECT.md
    Learner->>Learner: Correlate capture detail with runbook IOCs
```

### Prerequisites

From the repository root:

```bash
./scripts/elasticsearch-up.sh
./scripts/setup-kibana-data-views.sh   # data views + saved searches for all 23 scenarios
```

### Run this scenario with live Elasticsearch forwarding

**Terminal A — mock collector** (from `scenarios/23-trivy-supply-chain-attack`):

```bash
cd scenarios/23-trivy-supply-chain-attack
export TESTBENCH_MODE=enabled
export SCAS_ES_URL=http://localhost:9200
node infrastructure/mock-c2-server.js
```

**Terminal B — execute the lab:**

```bash
cd scenarios/23-trivy-supply-chain-attack
export TESTBENCH_MODE=enabled
export SCAS_ES_URL=http://localhost:9200
cd victim-ci && export TESTBENCH_MODE=enabled && node run-pipeline.js
```

### Verify locally (file-based evidence)

```bash
curl -s http://127.0.0.1:3023/captured-data
```

### Verify in Elasticsearch (API)

```bash
# Static runbook for this scenario
curl -s "http://localhost:9200/scas-rules/_doc/23?pretty"

# Latest runtime capture events
curl -s "http://localhost:9200/scas-detections/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": { "term": { "scenario_id": "23" } },
    "sort": [{ "@timestamp": "desc" }],
    "size": 5
  }'
```

### Verify in Kibana (UI)

1. Open [http://localhost:5601](http://localhost:5601)
2. **Discover** → **SCAS Detections — Scenario 23** — live capture timeline (`@timestamp`, `package.name`, `detail`)
3. **Discover** → **SCAS Rules — Scenario 23** — compare against `iocs`, `sigma`, and `yara` fields
4. Ask: *Does each capture field match an IOC or Sigma condition in the runbook?*

See [observability/README.md](../../../observability/README.md) for stack details.

## Part 9: Key Takeaways

1. **Security tools are high-value targets.** Attackers who compromise a scanner gain access to every environment that trusts it.

2. **Version tags are mutable by default.** `@v0.34.2` is NOT a fixed point in history — it can be rewritten. Only commit SHAs are immutable.

3. **Incomplete remediation creates windows.** Rotating credentials in batches (not atomically) gives attackers time to act with stolen credentials.

4. **The pipeline output looks normal.** The malicious code runs before the legitimate scan and silently fails — the developer sees a successful build.

5. **Defense in depth matters.** SHA pinning prevents the initial payload delivery; `harden-runner` provides network-level detection as a second layer.

---

## Part 10: Advanced Exercises

1. **Edit the workflow**: Update `victim-ci/.github/workflows/ci.yml` to use the SHA-pinned reference and verify `ci-workflow-auditor.js` clears `WF-02` and `WF-05`.

2. **Simulate `pull_request_target` risk**: Research why `pull_request_target` with `checkout` is dangerous. What change to the `ci.yml` would have prevented the initial PAT theft?

3. **Add an allowlist check**: Modify `trivy-version-scanner.js` to also accept a JSON allowlist of approved SHAs and flag anything not on the list.

4. **Extend the harvester**: Add a new field to `malicious-trivy/v0.69.4/trivy-action-like.js` that simulates reading `~/.gitconfig`. Run the pipeline and observe the additional data in the C2 capture.

5. **Write a Sigma rule**: Write a complete Sigma rule targeting the `ci_secret_exfil` event in the captured JSON structure. Compare it with the example in `DETECT.md`.

---

## 📚 Additional Resources

- [CVE-2026-33634 — NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-33634)
- [GitHub Security Advisory GHSA-69fq-xp46-6x23](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23)
- [step-security/harden-runner](https://github.com/step-security/harden-runner) — egress control for GitHub Actions
- [Allstar — GitHub Action policy enforcement](https://github.com/ossf/allstar)
- [SLSA Framework — Supply-chain Levels for Software Artifacts](https://slsa.dev)
- [GitHub Actions Security Best Practices — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)

---

## ⚠️ Safety & Ethics

- All malicious behavior in this lab is gated on `TESTBENCH_MODE=enabled`
- All exfiltration goes to `127.0.0.1:3023` — never to any external host
- The `trivy-action-like` module collects only environment variables already present in your shell — no file reads, no real credentials
- This scenario is for educational use in isolated lab environments only
- Do not run these payloads in shared CI systems or production environments
