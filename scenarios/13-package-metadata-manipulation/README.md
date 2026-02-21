# Scenario 13: Package Metadata Manipulation

## Learning Objectives

- Understand how package metadata can be manipulated to mislead consumers
- Detect inconsistencies between package metadata and contents
- Learn defenses: metadata validation, SBOM, and registry verification

## Background

Package metadata (name, repository, homepage, maintainers, publish time) is often trusted by consumers and automated tools. Attackers can manipulate metadata (typos, spoofed repository URLs, fake maintainer fields, or altered tarball URLs) to hide malicious intent or to redirect package consumers to attacker-controlled resources.

## Scenario Description

A widely used package (`clean-utils`) has had its metadata modified in a compromised publish: the `repository` points to a malicious mirror, the `author` is spoofed, and the tarball integrity fields do not match the actual package contents. Your tasks:

1. Red Team: craft a manipulated package metadata publish
2. Blue Team: detect mismatched metadata and tarball integrity
3. Security Team: implement defenses and incident response

## Setup

Prerequisites: Node.js 16+, npm

Environment:

```bash
cd scenarios/13-package-metadata-manipulation
export TESTBENCH_MODE=enabled
./setup.sh
```

## Structure

- legitimate-packages/ - expected correct package metadata
- compromised-packages/ - manipulated package metadata + malicious payload
- victim-app/ - app depending on `clean-utils`
- infrastructure/ - mock attacker server and captured-data
- detection-tools/ - metadata-validator and SBOM checks
- docs/ - quick reference and zero-to-hero guides

## Safety

All malicious behavior is gated by `TESTBENCH_MODE=enabled` and is local-only. Do not deploy to production.

---

Happy learning!

