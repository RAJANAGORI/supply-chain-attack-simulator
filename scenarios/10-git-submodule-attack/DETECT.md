# Detection Runbook: Scenario 10 (Git Submodule Attack)

## IOCs
- `git clone --recurse-submodules` or `git submodule update --init` fetches unexpected submodule URL.
- Submodule path `libs/malicious-submodule` contains executable `postinstall.sh`.
- Parent `package.json` `postinstall` invokes `bash libs/malicious-submodule/postinstall.sh`.
- Local file-protocol submodule URLs (`file://` or relative paths) in `.gitmodules` (lab uses `protocol.file.allow=always`).
- Similar indicators in git subtree history or vendored `vendor/` directories.
- Submodule URL/commit drift from approved baseline.
- Mock exfil events on `127.0.0.1:3000` with `attackType: git-submodule`.

## Sample Log Lines
```json
{"scenario_id":"10","event_type":"submodule_postinstall_exec","package":"malicious-submodule","attackType":"git-submodule","source":"libs/malicious-submodule/postinstall.sh","destination":"127.0.0.1:3000","timestamp_utc":"2026-06-30T04:27:18.958Z"}
```

## Sigma (example)
```yaml
title: Suspicious Git Submodule Clone And Postinstall Chain
detection:
  selection_git:
    process.command_line|contains|all: ["git", "clone", "--recurse-submodules"]
  selection_npm:
    process.command_line|contains|all: ["bash", "postinstall.sh"]
    process.command_line|contains: "malicious-submodule"
  condition: selection_git or selection_npm
level: high
```

## YARA-like Text Rule (example)
```text
rule Submodule_Attack_IOC {
  strings:
    $a = ".gitmodules"
    $b = "postinstall.sh"
    $c = "malicious-submodule"
  condition:
    2 of them
}
```

## EDR/SIEM What To Expect
- Git metadata change + submodule fetch + npm/bash script execution sequence.
- Submodule path running executable content during `npm install` / build setup.
- `protocol.file.allow` or local submodule URL usage (CVE-2022-39253 bypass indicator).
- Capture artifacts in scenario `infrastructure/captured-data.json`.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc10-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 10`.

## Mitigation

- Review every submodule, subtree, or vendored dependency addition in pull requests.
- Validate embedded repository URLs against an allowlist; reject local `file://` and relative paths.
- Pin embedded dependencies to verified commits; do not track floating branch heads.
- Set `protocol.file.allow=never` globally and in CI runners to block CVE-2022-39253-style local protocol abuse.
- Scan subtree and vendored code with the same rules as git submodule code.
- Monitor initialization behavior and lifecycle scripts in build pipelines.

## Straightforward Implementation

### 1. Pin submodules, subtrees, and vendored code to commits

```bash
# git submodule
git submodule add https://github.com/org/lib.git
cd lib && git checkout <commit-sha>
cd .. && git commit -am "Pin submodule to commit"

# git subtree
git subtree add --prefix=vendor/lib https://github.com/org/lib.git <commit-sha> --squash
```

### 2. CI gate

```yaml
# .github/workflows/submodule-check.yml
- run: |
    git submodule foreach 'git log --oneline -1'
    git config --file .gitmodules --get-regexp 'url' | grep -v 'allowed-github.example.com' && exit 1 || true
- run: |
    # Block local file-protocol abuse for submodules, subtrees, and vendored fetches
    git config --global protocol.file.allow never
    test -d vendor && find vendor -type f -name '*.sh' -print | xargs -r grep -E 'curl|wget|nc ' && exit 1 || true
```

### 3. CODEOWNERS

```text
# .github/CODEOWNERS
.gitmodules @org/security-team
vendor/ @org/security-team
```

### 4. Git config

```bash
git config --global protocol.file.allow never
```
