# Detection Runbook: Scenario 16 (Package Cache Poisoning)

## IOCs
- Repeated compromise after reinstall indicates cache persistence.
- Dependency source originates from poisoned cache path such as `~/.npm/_cacache`, `~/.cache/pnpm`, or a CI cache restore.
- Unexpected tarball in Artifactory remote cache with mismatched integrity.
- Exfil/capture events on `127.0.0.1:3016`.

## Sample Log Lines
```json
{"scenario_id":"16","event_type":"cache_persistence_exec","source":"cached-package","destination":"127.0.0.1:3016","timestamp_utc":"2026-04-20T13:15:00Z"}
```

## Sigma (example)
```yaml
title: Persistent Package Compromise Across Reinstall
detection:
  selection:
    process.command_line|contains|all: ["npm", "install"]
    event.action: "repeat_compromise"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Cache_Poisoning_IOC {
  strings:
    $a = "cache"
    $b = "captured-data"
    $c = "3016"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Same malicious behavior after fresh `node_modules` removal.
- Evidence of cache artifact reuse.
- Detector findings from `cache-poisoning-detector.js`.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc16-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 16`.

## Mitigation

- Clear npm, pnpm, Yarn, and CI caches during incident response and after any registry compromise.
- Bind CI cache keys to `package-lock.json`/`pnpm-lock.yaml` hashes and revalidate integrity on restore.
- Use immutable artifact mirrors and deterministic installs (`npm ci`) in production pipelines.
- Monitor cache paths (`~/.npm`, `_cacache`, `~/.cache/pnpm`, `~/.yarn/cache`, GitHub Actions cache, Artifactory remote cache) for unauthorized mutations.
- Separate developer cache trust from production build trust boundaries.
- Document cache-invalidation playbooks for npm, pnpm, Yarn, GitHub Actions, and Artifactory.

## Straightforward Implementation

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
