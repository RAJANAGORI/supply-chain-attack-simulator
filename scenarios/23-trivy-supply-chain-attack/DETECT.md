# Detection Runbook: Scenario 23 (Trivy Supply Chain Attack — CVE-2026-33634)

## IOCs
- References to `aquasecurity/trivy-action@v0.34.x` or `aquasecurity/setup-trivy@v0.x.x` (up to v0.2.5) in workflow files.
- Docker image tags `aquasec/trivy:0.69.4`, `aquasec/trivy:0.69.5`, or `aquasec/trivy:0.69.6` in CI configs or Dockerfiles.
- Unexpected POST beacon to `127.0.0.1:3023` (lab) or `scan.aquasecurtiy[.]org` (real incident — note typosquatted domain).
- Presence of a GitHub repository named `tpcp-docs` in the organization (real attack backup exfil channel).
- IOC marker file `infrastructure/captured-data.json` containing CI credential fields (lab evidence).

## Sample Log Lines
```json
{"scenario_id":"23","event_type":"ci_secret_exfil","source":"trivy-action-like@0.69.4","destination":"127.0.0.1:3023","attack_vector":"force-pushed-tag","attacker_group":"TeamPCP","cve":"CVE-2026-33634","timestamp_utc":"2026-03-19T14:30:00Z"}
```

## Sigma (example)
```yaml
title: Compromised Trivy Action CI Exfil Beacon
detection:
  selection:
    process.command_line|contains: "trivy-action"
    network.destination.ip: "127.0.0.1"
    network.destination.port: 3023
  condition: selection
level: critical
tags:
  - attack.exfiltration
  - attack.t1567
  - cve.2026.33634
```

## YARA-like Text Rule (example)
```text
rule Trivy_Supply_Chain_IOC {
  strings:
    $a = "trivy-action@v0.34."
    $b = "aquasecurtiy"
    $c = "tpcp-docs"
    $d = "trivy:0.69.4"
    $e = "trivy:0.69.5"
    $f = "trivy:0.69.6"
  condition:
    any of them
}
```

## EDR/SIEM What To Expect
- HTTP POST from a CI runner process to an external domain immediately after trivy-action step begins.
- Network connection to `scan.aquasecurtiy[.]org` (typosquatted) from a build agent.
- Unexpected `tpcp-docs` repository creation events in GitHub audit logs around March 19–22, 2026.
- CI pipeline logs show trivy-action step completing normally (infostealer preserves legitimate output to avoid detection).
- In the lab: capture evidence at `infrastructure/captured-data.json` with `ci_secret_exfil` event type.

## Mitigation

- Contain: disable and re-queue all pipelines that ran `trivy-action@v0.34.x` or `setup-trivy@v0.2.5` or earlier after March 19 2026.
- Eradicate: replace every mutable tag reference with an immutable commit SHA (`aquasecurity/trivy-action@<SHA>`).
- Recover: rotate all CI secrets (GITHUB_TOKEN, AWS keys, registry credentials, database URLs) accessible to affected pipeline runs.
- Hunt: scan every workflow YAML in the organization for compromised version strings; check Dockerfiles and container registries for `trivy:0.69.4/5/6`.
- Harden: enforce SHA pinning for all third-party actions via policy (e.g. `step-security/harden-runner`, Allstar, or custom CI lint); alert on unexpected outbound network calls from action steps.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc23-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 23`.
