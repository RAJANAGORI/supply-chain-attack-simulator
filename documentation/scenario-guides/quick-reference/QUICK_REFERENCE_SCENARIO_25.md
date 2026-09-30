# Quick Reference - Scenario 25: Compromised Reusable GitHub Action



## Table of Contents

<div class="doc-toc">

- [Setup](#setup)
- [Trigger the attack](#trigger-the-attack)
- [Detect](#detect)
- [Mitigate](#mitigate)

</div>

---
## Setup

```bash
cd scenarios/25-compromised-github-action
./setup.sh
```

## Trigger the attack

```bash
./attack.sh
```

The attacker force-pushes a malicious version of a reusable action. The victim workflow runs the action, which harvests `GITHUB_TOKEN` and environment secrets, then exfiltrates mock data to `127.0.0.1:3025`.

## Detect

Check mock server capture:

```bash
curl http://127.0.0.1:3025/capture | jq .
```

Look for `GITHUB_TOKEN`, secret names, and artifact paths.

## Mitigate

- Pin every third-party action to an immutable commit SHA.
- Set the minimum `permissions` on each workflow job.
- Do not pass repository secrets into third-party actions unless necessary.
- Require security review of every workflow diff.

See the full [README.md](../../../scenarios/25-compromised-github-action/README.md) and [DETECT.md](../../../scenarios/25-compromised-github-action/DETECT.md).
