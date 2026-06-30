# Detection Runbook: Scenario 11 (Registry Mirror Poisoning)

## IOCs
- Corporate `.npmrc` sets `registry=http://localhost:4873/` (lab mirror; production: internal Nexus/Artifactory host).
- `npm install` fetches package metadata and tarballs from poisoned mirror server, not upstream npmjs.com.
- Mirror-served packages (`enterprise-utils`, `secure-lib`) contain `postinstall` scripts absent from upstream baseline.
- Tarball integrity (`sha512-` / `shasum`) differs from upstream digest for same name@version.
- Internal installs resolve to poisoned mirror content while app continues to function normally.
- Runtime/mock beacon events to `127.0.0.1:3000` with `attackType: registry-mirror-poisoning`.

## Sample Log Lines
```json
{"scenario_id":"11","event_type":"mirror_poison_postinstall","package":"enterprise-utils","version":"1.0.0","attackType":"registry-mirror-poisoning","source":"compromised-mirror","destination":"127.0.0.1:3000","timestamp_utc":"2026-06-30T04:27:53.726Z"}
```

## Sigma (example)
```yaml
title: Registry Mirror Serves Package With Unexpected Postinstall
detection:
  selection_install:
    process.command_line|contains: "npm install"
  selection_mirror:
    process.network_connection|contains: ":4873"
  selection_postinstall:
    process.command_line|contains: "postinstall.js"
  condition: selection_install and (selection_mirror or selection_postinstall)
level: high
```

## YARA-like Text Rule (example)
```text
rule Registry_Mirror_Poisoning_IOC {
  strings:
    $a = "registry-mirror-poisoning"
    $b = "postinstall"
    $c = "compromised-mirror"
  condition:
    2 of them
}
```

## EDR/SIEM What To Expect
- Registry endpoint usage to internal mirror host (`:4873` in lab) during `npm install`.
- Tarball download followed immediately by `postinstall` child process.
- Hash/integrity mismatch between mirror artifact and trusted upstream origin.
- Mirror validator flags `CRITICAL` postinstall drift vs `legitimate-packages/`.
- Local capture output in `infrastructure/captured-data.json`.

## Mitigation

- Secure mirror access — limit who can publish or modify mirror storage.
- Audit mirror configuration and cached packages on a schedule.
- Verify mirror packages match upstream registry digests.
- Implement strict access controls and MFA on mirror admin paths.
- Monitor mirror behavior and alert on unexpected package mutations.
- Compare installed `node_modules` scripts against upstream baseline after every mirror sync.
