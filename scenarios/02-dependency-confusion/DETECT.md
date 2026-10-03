# Detection Runbook: Scenario 02 (Dependency Confusion)

## IOCs
- Scoped package `@techcorp/auth-lib` resolved from unexpected registry (`localhost:4874` in lab; public npm in production).
- Installed version `999.999.999` - far higher than approved internal version (`1.0.x`).
- `.npmrc` scope mapping `@techcorp:registry` points at attacker-controlled or public registry instead of internal registry.
- `package-lock.json` `resolved` URL references non-internal registry host for scoped packages.
- `postinstall` script execution immediately after `npm install` (phase: `postinstall`).
- Local beacon activity to `127.0.0.1:3000` during install (not only at app runtime).
- Resolved version for an internal-scope package jumps more than one major version above the approved baseline.
- Maintainer publishing an internal-scope package has not been seen in previous releases.

## Sample Log Lines
```json
{"scenario_id":"02","event_type":"dependency_confusion_postinstall","package":"@techcorp/auth-lib","version":"999.999.999","attackType":"dependency-confusion","registrySource":"public-npm (localhost:4874) - attacker-controlled","phase":"postinstall","destination":"127.0.0.1:3000","timestamp_utc":"2026-06-30T04:30:16.556Z"}
```

## Sigma (example)
```yaml
title: Scoped Package Resolved From Unexpected Registry With Suspicious Version
detection:
  selection_install:
    process.command_line|contains|all: ["npm", "install"]
  selection_version:
    Image|endswith: "node"
    CommandLine|contains: "999.999.999"
  selection_registry:
    process.network_connection|contains: ":4874"
  condition: selection_install and (selection_version or selection_registry)
level: high
```

## Sigma: Semver Jump / First-Seen Maintainer (example)
```yaml
title: Internal Scope Package With Unusual Semver Jump Or New Maintainer
detection:
  selection_scope:
    package.name|startswith: "@techcorp/"
  selection_jump:
    package.version_diff|gt: 1
  selection_new_maintainer:
    package.maintainer_is_new: "true"
  condition: selection_scope and (selection_jump or selection_new_maintainer)
level: high
```

## YARA-like Text Rule (example)
```text
rule Dependency_Confusion_Indicator {
  strings:
    $a = "@techcorp/auth-lib"
    $b = "999.999.999"
    $c = "127.0.0.1:3000"
    $d = "dependency-confusion"
    $e = "version-jump"
    $f = "first-seen-maintainer"
  condition:
    ($a and $b) or ($a and $c) or ($a and $d) or ($a and ($e or $f))
}
```

## EDR/SIEM What To Expect
- HTTP metadata requests to local registry server (`:4874`) before tarball download.
- Tarball fetch for scoped package from non-internal registry host.
- `postinstall` child process spawned from `node_modules/@techcorp/auth-lib/` during install.
- Resolver behavior inconsistent with scoped registry policy in `.npmrc`.
- Capture records in `infrastructure/captured-data.json` with `phase: postinstall`.
- Dependency resolution telemetry showing a scoped package resolving more than one major version above baseline.
- New maintainer identity on a scoped package that historically shipped from an internal registry.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc02-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 02`.

## Mitigation

- Configure scope-specific registry routing in `.npmrc` (e.g. `@org:registry=...`).
- Enforce package lock files and use `npm ci --audit` in CI/CD.
- Isolate private registry traffic from public npm at the network layer.
- Reserve internal namespaces on public registries where applicable.
- Pin dependencies to exact versions for critical packages.
- Verify package integrity hashes on install.
- Add build-time validation to reject unexpected registry sources.
- Alert on unusual semver jumps and first-seen maintainers.

## Straightforward Implementation

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
