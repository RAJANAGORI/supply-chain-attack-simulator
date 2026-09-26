# Scenario 20: npm Provenance / Attestation Abuse




> **Live signing mechanism:** `setup.sh` generates a real Ed25519 keypair and uses the private key to sign both an npm provenance statement and a GitHub artifact attestation for the malicious `trusted-logger` package. `victim-app/index.js` performs real `crypto.verify()` against both bundles and sees VALID. It loads the package, and the `TESTBENCH_MODE`-gated payload exfiltrates to `localhost:3020`. This is the authentic CI-compromise provenance-abuse pattern: valid identity, valid integrity, malicious contents.







## Table of Contents

<div class="doc-toc">

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Threat Model Snapshot](#threat-model-snapshot)
- [Scenario Description](#scenario-description)
- [Setup](#setup)
- [Run the lab](#run-the-lab)
- [📝 Lab Tasks](#📝-lab-tasks)
- [Structure](#structure)
- [Evidence](#evidence)
- [Detection](#detection)
- [Mitigation Playbook](#mitigation-playbook)
- [Expected Outcome](#expected-outcome)
- [Straightforward Implementation](#straightforward-implementation)
- [Validation Checklist](#validation-checklist)
- [Hints](#hints)
- [Lab Report Prompts](#lab-report-prompts)
- [Safety](#safety)

</div>

---
## Learning Objectives

- Understand what npm provenance and GitHub artifact attestations actually prove.
- See why valid signatures do not guarantee safe package contents.
- Practice verifying provenance statements and attestation bundles.
- Learn how a compromised CI workflow can abuse trusted publishing machinery.
- Map detection and mitigation controls that work even when signatures are valid.

## Background

[npm provenance](https://docs.npmjs.com/generating-provenance-statements) and [GitHub artifact attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds) tell consumers two things:

1. **Identity** - which source repository, workflow, and ref built the package.
2. **Integrity** - that the published tarball was not modified after the build.

They do **not** prove that the source code or build steps were not malicious. If an attacker compromises the CI workflow or steals the signing key, they can produce perfectly valid provenance and attestation for a malicious package.

### Why This Attack is Dangerous

- Valid signatures bypass the most common "is it signed?" checklist.
- The artifact digest in the provenance matches the downloaded tarball.
- Defenders often stop at signature presence instead of reviewing builder behavior.
- A compromised workflow can sign anything it is allowed to build.

### Real-World Parallels

- Compromised CI/CD pipelines that publish to npm with `--provenance`.
- Stolen Sigstore or GitHub Actions OIDC signing credentials used to mint valid attestations.
- Malicious releases that pass `npm audit signatures` because the signature itself is legitimate.

## Threat Model Snapshot

- **Asset at risk**: trust placed in signed package metadata.
- **Trust edge abused**: CI/CD signing key and expected workflow identity.
- **Attacker objective**: publish a malicious package whose provenance and attestation both verify.
- **Blast radius**: every consumer, pipeline, or registry mirror that trusts signatures alone.

## Scenario Description

This lab uses a local file dependency (`trusted-logger`) that carries a real Ed25519-signed npm provenance statement and GitHub artifact attestation. The victim application verifies both before loading the package. Because the attacker compromised the CI signing key, both checks pass. Your tasks:

1. **Red team**: Confirm that the package's signatures verify and that it still exfiltrates.
2. **Blue team**: Capture the runtime beacon and the detector findings.
3. **Defender**: Identify controls that would catch the compromise before trust is granted.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/20-package-version-confusion
export TESTBENCH_MODE=enabled
./setup.sh
```

`./setup.sh` generates the Ed25519 keypair, signs `provenance.json` and `attestation.sigstore.json`, creates the victim app and detector, installs the file dependency, and prints the same numbered steps as **Run the lab** below.

## Run the lab

Use two terminals. All paths are relative to `scenarios/20-package-version-confusion`.

### Terminal A - mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B - verify signatures and run the victim

```bash
# Confirm both signatures are cryptographically valid
node infrastructure/verify-provenance.js malicious-package/trusted-logger

# Run the victim: it verifies provenance/attestation, then loads the package
cd victim-app
npm start
```

### Detection (from scenario root)

```bash
node detection-tools/provenance-abuse-detector.js victim-app
```

### Verify capture

```bash
curl -s http://127.0.0.1:3020/captured-data
```

### Cleanup (optional)

```bash
../../scripts/setup/kill-port.sh 3020
```

## 📝 Lab Tasks

Follow **Run the lab** above first. The sections below expand on analysis, detection, and prevention.

### Part 1: Inspect the Signed Metadata

```bash
# npm provenance statement (SLSA v1 predicate)
cat malicious-package/trusted-logger/provenance.json

# GitHub artifact attestation bundle
cat malicious-package/trusted-logger/attestation.sigstore.json

# The victim uses this public key to verify signatures
cat victim-app/keys/provenance-public.pem
```

**Questions:**
- What repository and workflow identity is embedded in the provenance?
- What digest algorithm and subject name is used?
- Why does the artifact digest match even though the code is malicious?

### Part 2: Verify the Signatures

```bash
node infrastructure/verify-provenance.js malicious-package/trusted-logger
```

**What to observe:**
- Both signatures verify as VALID.
- The artifact digest matches the signed subject.
- The package still contains a hidden exfiltration branch.

### Part 3: Trigger the Abuse

```bash
cd victim-app
npm start
```

**What happens:**
1. `index.js` verifies `provenance.json`.
2. `index.js` verifies `attestation.sigstore.json`.
3. Both checks pass, so the app loads `trusted-logger`.
4. The `TESTBENCH_MODE`-gated branch sends mock data to `localhost:3020`.

### Part 4: Detection

```bash
node detection-tools/provenance-abuse-detector.js victim-app
```

**Key takeaway:** Behavioral scanning catches the exfiltration pattern. Signature verification alone cannot, because the signing key was compromised.

### Part 5: Mitigation

- Pin the expected builder identity, repository, and ref in verification policy.
- Require behavioral scanning even for signed packages.
- Monitor CI workflow changes and signing-credential usage.
- Segment CI jobs so a build runner cannot sign arbitrary artifacts.

## Structure

- `infrastructure/` - mock server (port **3020**), key generation, provenance builder, optional verifier.
- `victim-app/` - application that verifies provenance/attestation before requiring `trusted-logger`.
- `malicious-package/trusted-logger/` - signed malicious package with `provenance.json` and `attestation.sigstore.json`.
- `templates/malicious-package-template.js` - source template for the malicious package.
- `detection-tools/provenance-abuse-detector.js` - flags behavioral indicators.

## Evidence

- `http://localhost:3020/captured-data`
- `infrastructure/captured-data.json`

## Detection

```bash
node detection-tools/provenance-abuse-detector.js victim-app
```

Key indicators to capture:

- Valid `provenance.json` and `attestation.sigstore.json` on a package that performs network calls.
- Runtime HTTP beacon to `127.0.0.1:3020` from `node_modules/trusted-logger/`.
- `TESTBENCH_MODE`-gated branch containing `http.request` and `collect`.
- No signature verification errors in application logs.

## Mitigation Playbook

- Treat provenance and attestation as identity and integrity signals, not safety guarantees.
- Pin expected builder identity, repository, and ref in verification policy.
- Run behavioral scanners on every installed package, even when signatures are valid.
- Monitor CI workflow changes and signing-credential usage.
- Segment CI jobs so build runners cannot sign arbitrary artifacts.
- Publish to and verify against a transparency log when available.
- Require lockfiles and deterministic `npm ci` installs in CI.

## Expected Outcome

- `node infrastructure/verify-provenance.js` reports both signatures as VALID.
- The victim app loads the package and the mock server receives exfiltrated data.
- `node detection-tools/provenance-abuse-detector.js` flags behavioral indicators.

## Straightforward Implementation

### 1. Verification policy

```bash
# Require provenance and attestation checks
npm config set provenance true
npm audit signatures
```

### 2. Builder identity allowlist

```javascript
// scripts/verify-provenance-policy.js
const allowedBuilders = [
  'https://github.com/myorg/trusted-logger/.github/workflows/publish.yml@refs/heads/main'
];

function checkProvenance(bundle) {
  const builderId = bundle.predicate.runDetails.builder.id;
  if (!allowedBuilders.includes(builderId)) {
    throw new Error(`Unexpected builder: ${builderId}`);
  }
}
```

### 3. CI gate

```yaml
# .github/workflows/install-check.yml
- run: npm ci --ignore-scripts
- run: npm audit signatures
- run: node scripts/verify-provenance-policy.js
- run: node scripts/behavioral-scan.js node_modules/trusted-logger
```

### 4. Workflow and key monitoring

Alert when the publish workflow file or the signing credential is modified. Use GitHub organization audit logs and cloud HSM/key vault logs to detect unexpected signing events.

## Validation Checklist

- [ ] I observed both provenance and attestation signatures verify as valid.
- [ ] I captured the exfiltration beacon at `localhost:3020`.
- [ ] I ran the detector and mapped its warnings to the actual package code.
- [ ] I documented controls that would catch a compromised CI workflow.

## Hints

- If verification fails, make sure you ran `./setup.sh` and that `victim-app/keys/provenance-public.pem` exists.
- If the capture is empty, verify the mock server is running on `3020` and `TESTBENCH_MODE=enabled` is set.
- Use `../../scripts/setup/kill-port.sh 3020` for cleanup.

## Lab Report Prompts

- Which control catches this earliest: builder identity pinning, workflow monitoring, or behavioral scanning?
- How should teams balance the convenience of automated provenance with the risk of a compromised workflow?
- What telemetry is required to detect valid-signed malicious packages at scale?

## Safety

Local simulation only; requires `TESTBENCH_MODE=enabled` for malicious branches.

---

Happy learning!
