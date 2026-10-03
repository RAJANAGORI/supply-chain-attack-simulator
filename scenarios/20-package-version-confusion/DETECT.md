# Detection Runbook: Scenario 20 (npm Provenance / Attestation Abuse)

## IOCs
- Package `trusted-logger@9.9.9` carries a valid `provenance.json` and a valid `attestation.sigstore.json`.
- Both bundles verify with the same Ed25519 public key (`victim-app/keys/provenance-public.pem`).
- The provenance subject digest (sha512) matches the installed `index.js` artifact.
- The package code contains `http.request`, `localhost:3020`, and a `TESTBENCH_MODE` check.
- Runtime beacon to `127.0.0.1:3020` from `node_modules/trusted-logger/index.js`.
- Application logs show `Provenance signature valid: YES` immediately before exfiltration.

## Sample Log Lines
```json
{"scenario_id":"20","event_type":"provenance_abuse_exfil","package":"trusted-logger","version":"9.9.9","attackType":"npm-provenance-attestation-abuse","provenanceValid":true,"attestationValid":true,"destination":"127.0.0.1:3020","timestamp_utc":"2026-09-25T09:00:00Z"}
```

## Sigma (example)
```yaml
title: Package With Valid Provenance But Runtime Exfiltration Pattern
detection:
  selection_load:
    process.command_line|contains: "node"
    file.path|contains: "node_modules/trusted-logger/index.js"
  selection_provenance:
    file.path|endswith: "provenance.json"
    file.path|startswith: "node_modules/trusted-logger/"
  selection_exfil:
    process.network_connection|contains: "127.0.0.1:3020"
condition: selection_load and selection_provenance and selection_exfil
level: critical
```

## Sigma: Builder Identity Anomaly (example)
```yaml
title: npm Provenance Signed By Unexpected Builder Identity
detection:
  selection:
    event.dataset: npm.provenance
  unexpected_builder:
    provenance.builder.id|contains:
      - "unexpected-repo"
      - "refs/heads/feature/"
  condition: selection and unexpected_builder
level: high
```

## YARA-like Text Rule (example)
```text
rule Provenance_Abuse_Indicator {
  strings:
    $a = "trusted-logger"
    $b = "provenance.json"
    $c = "attestation.sigstore.json"
    $d = "localhost:3020"
    $e = "npm-provenance-attestation-abuse"
  condition:
    ($a and ($b or $c)) or ($a and $d) or ($a and $e)
}
```

## EDR/SIEM What To Expect
- Node process logs successful provenance and attestation verification.
- `http.request` call to `127.0.0.1:3020` shortly after package load.
- No signature verification errors in application or registry logs.
- Capture records in `infrastructure/captured-data.json` with `provenanceValid: true`.
- The malicious package has no `postinstall` script; the abuse happens at runtime require time.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc20-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 20`.

## Mitigation

- Treat npm provenance and GitHub artifact attestations as identity and integrity signals, not safety guarantees.
- Pin expected builder identity, repository, and ref in a verification policy that fails closed.
- Run behavioral scans on installed packages even when signatures and provenance verify.
- Monitor CI workflow changes and signing-credential usage for unexpected events.
- Segment CI jobs so build runners cannot sign arbitrary artifacts or access signing keys.
- Publish to and verify against a transparency log when the registry supports it.
- Require lockfiles and deterministic npm ci installs in CI pipelines.

## Straightforward Implementation

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
