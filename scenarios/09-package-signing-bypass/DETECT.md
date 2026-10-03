# Detection Runbook: Scenario 09 (Package Signing Bypass)

## IOCs
- Package carries valid `package.sig` (Ed25519) but contains malicious `postinstall.js`.
- Legitimate v1.0.0 and compromised v1.0.1 share the same `keyId` / `keyFingerprint` (stolen key).
- `crypto.verify()` returns valid for both packages - signature check alone does not flag compromise.
- Detection tool reports `MALICIOUS_POSTINSTALL` / `CRITICAL` despite `VALID_SIGNATURE`.
- Runtime callbacks to `127.0.0.1:3000` with `signatureStatus: VALID` and `keyCompromised: true`.
- Provenance or attestation record exists but the CI identity or repository that produced it is compromised.
- Signing key material in `infrastructure/keys/` (lab only; in production, monitor HSM/signing audit logs).

## Sample Log Lines
```json
{"scenario_id":"09","event_type":"signature_bypass_postinstall","package":"secure-utils","version":"1.0.1","attackType":"package-signing-bypass","signatureStatus":"VALID","keyCompromised":true,"destination":"127.0.0.1:3000","timestamp_utc":"2026-06-30T04:33:26.546Z"}
```

## Sigma (example)
```yaml
title: Signed Package With Postinstall Exfiltration Pattern
detection:
  selection_signed:
    process.command_line|contains: "postinstall"
    process.parent.command_line|contains: "npm install"
  selection_exfil:
    process.network_connection|contains: "127.0.0.1:3000"
    process.command_line|contains: "secure-utils"
  condition: selection_signed and selection_exfil
level: critical
```

## YARA-like Text Rule (example)
```text
rule Signing_Bypass_Indicator {
  strings:
    $a = "package.sig"
    $b = "Ed25519"
    $c = "/collect"
    $d = "postinstall"
  condition:
    ($a and $d) or ($c and $d)
}
```

## EDR/SIEM What To Expect
- Install-time `postinstall` from signed package directory.
- Cryptographic verification logs show success while behavioural scanner flags exfil patterns.
- Same key fingerprint on multiple package versions signed at different times.
- Capture records in `infrastructure/captured-data.json` with `keyCompromised: true`.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc09-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 09`.

## Mitigation

- Treat signatures and provenance as identity and integrity signals, not safety guarantees; pair with behavioral scanning.
- Publish npm packages with `--provenance` and verify with `npm audit signatures` or `gh attestation verify`.
- Store signing keys in HSMs or KMS with MFA, strict ACLs, and signing audit logs.
- Rotate keys on schedule and after maintainer departure or suspected compromise.
- Monitor CI workflow changes and signing-credential usage for unexpected events.
- Segment CI jobs so build runners cannot sign arbitrary artifacts or access signing keys.
- Verify artifact attestations from trusted CI identities before deployment.

## Straightforward Implementation

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
