# Detection Runbook: Scenario 09 (Package Signing Bypass)

## IOCs
- Package carries valid `package.sig` (Ed25519) but contains malicious `postinstall.js`.
- Legitimate v1.0.0 and compromised v1.0.1 share the same `keyId` / `keyFingerprint` (stolen key).
- `crypto.verify()` returns valid for both packages — signature check alone does not flag compromise.
- Detection tool reports `MALICIOUS_POSTINSTALL` / `CRITICAL` despite `VALID_SIGNATURE`.
- Runtime callbacks to `127.0.0.1:3000` with `signatureStatus: VALID` and `keyCompromised: true`.
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

## Mitigation

- Protect signing keys with HSMs or hardened secret stores.
- Require MFA for all key access and signing operations.
- Rotate signing keys on a regular schedule and after incidents.
- Limit who can sign packages with strict access controls.
- Always verify signatures — but pair with behavioral and content analysis.
- Monitor signing activity for anomalies (time, volume, key fingerprint).
