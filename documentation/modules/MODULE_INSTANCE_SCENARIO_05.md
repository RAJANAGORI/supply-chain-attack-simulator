# Module Instance: Scenario 05 (Build Compromise)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

Use this module to shift attention from app code to the build pipeline, where trust is often assumed.

## 1) Module Card

- **Module ID**: `05`
- **Title**: `Build System Compromise`
- **Level**: `Advanced`
- **Estimated Time**: `90+ minutes`
- **Primary Attack Surface**: `CI/CD pipeline and artifact trust`
- **Prerequisites**: CI/CD basics, build script familiarity

## 2) Learning Objectives

- Explain how build pipeline trust can be abused for downstream compromise.
- Reproduce a controlled build-stage tampering scenario.
- Detect script/artifact anomalies across build phases.
- Apply pipeline hardening and provenance controls.

## 3) Threat Model Snapshot

- **Asset at risk**: build artifacts and deployment outputs
- **Trust edge abused**: CI runner -> build artifact publication
- **Attacker objective**: inject malicious code during automated builds
- **Blast radius**: all deployments consuming compromised artifacts

## 4) Lab Setup

```bash
cd scenarios/05-build-compromise
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Review baseline pipeline scripts and steps.
2. Trigger compromised build path.
3. Compare generated artifacts and runtime behavior.

## 6) Detection Playbook

- **Static checks**: CI config drift, script checksum changes, dependency source changes.
- **Behavioral checks**: unusual network access during build, artifact hash mismatches.
- **Evidence artifacts**: build logs, artifact digests, scanner outputs.

## 7) Mitigation Playbook

- Enforce signed/provenanced build artifacts.
- Lock down runner permissions and secrets scope.
- Require policy-as-code checks on pipeline changes.

## 8) Validation Checklist (Success Criteria)

- [ ] Build compromise reproduced and explained with evidence.
- [ ] Tampering signals captured across logs/artifacts.
- [ ] CI hardening controls mapped to actionable owners.

## 9) Production Policy Snippet

```yaml
- name: Verify artifact provenance
  run: node scripts/verify-artifact-provenance.js
```

## 10) Debrief Questions

- Which pipeline permission was unnecessary and should be removed first?
- Which stage had the weakest trust boundary?
- How can artifact verification fail closed in CI?
