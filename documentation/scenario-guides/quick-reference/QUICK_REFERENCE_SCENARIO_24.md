# Quick Reference - Scenario 24: Slopsquatting



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
cd scenarios/24-slopsquatting
./setup.sh
```

## Trigger the attack

```bash
./attack.sh
```

The attacker uploads a malicious package whose name matches an LLM-hallucinated import. The victim app installs it and the payload exfiltrates mock environment data to `127.0.0.1:3024`.

## Detect

Check mock server capture:

```bash
curl http://127.0.0.1:3024/capture | jq .
```

Look for `package_name`, `hostname`, and environment variables.

## Mitigate

- Pin all dependencies to exact versions and verify package names with the upstream registry.
- Audit code and generated suggestions before installing packages.
- Use private registries and namespace claims for internal packages.

See the full [README.md](../../../scenarios/24-slopsquatting/README.md) and [DETECT.md](../../../scenarios/24-slopsquatting/DETECT.md).
