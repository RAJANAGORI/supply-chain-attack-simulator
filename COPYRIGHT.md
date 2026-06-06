# Copyright and ownership

**Supply Chain Attack Simulator** (SCAS) — original educational platform for software supply chain security.

> This page explains how authorship and licensing work in this repository. It is not legal advice.

## Copyright holder

**Raja Nagori**  
Copyright (c) 2024–2026 Raja Nagori

Creating and publishing this project establishes copyright in the original scenarios, documentation, curriculum, diagrams, and related materials. The public [GitHub repository](https://github.com/rajanagori/supply-chain-attack-simulator) and [project website](https://rajanagori.github.io/supply-chain-attack-simulator/) are the canonical sources.

## Dual licensing

| Material | License | File |
|----------|---------|------|
| **Software** — `scenarios/`, `scripts/`, `detection-tools/`, `observability/`, mock servers, CI, site app code | [MIT License](LICENSE) | `LICENSE` |
| **Documentation** — `documentation/`, guides, modules, learning paths, web docs content | [CC BY-NC-ND 4.0](LICENSE-DOCUMENTATION.md) | `LICENSE-DOCUMENTATION.md` |

See also [NOTICE](NOTICE) and [ATTRIBUTION.md](ATTRIBUTION.md).

## What you must do when reusing

### Software (MIT)

- Keep the **copyright notice** and MIT license text in copies or substantial portions
- Do **not** remove Raja Nagori’s copyright and claim you wrote the codebase

### Documentation (CC BY-NC-ND)

- **Credit** Raja Nagori and link to this repository
- **No commercial reuse** without permission
- **No republishing modified** guides/curriculum as your own derivative work

## What is not allowed

- Removing copyright or license notices and presenting SCAS as your original creation
- Rebranding documentation or the full curriculum and implying you authored it
- Selling or commercially distributing documentation derivatives without permission
- Misrepresenting affiliation with or endorsement by Raja Nagori

If someone violates these terms (especially stripping attribution), you may use [GitHub’s DMCA process](https://docs.github.com/en/site-policy/content-removal-policies/submitting-content-removal-requests) or contact the copyright holder directly.

## Contributors

Contributors retain copyright in their own commits but license contributions under the same repository terms. See [AUTHORS.md](AUTHORS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Provenance fingerprints

This repository includes a canonical authorship record in [`SCAS_PROVENANCE.json`](SCAS_PROVENANCE.json) and a stable fingerprint token (`SCAS-FP-RN-8d4f2c9a1e7b3065`) embedded in platform files (HTML comments, manifests, Docker labels, setup scripts, and detection tooling).

To check a checkout:

```bash
./scripts/verify-provenance.sh
```

Scenario labs inherit the same fingerprint via `scenarios/_shared/scenario-provenance.js` (loaded by mock servers) and `./scripts/embed-scenario-provenance.sh` (re-applies markers to all scenario `setup.sh`, templates, and infrastructure files).

If someone removes visible copyright notices but leaves these markers (or vice versa), the mismatch supports a claim that the copy originated here. **Git commit history on the canonical repository remains the strongest technical evidence**; fingerprints supplement LICENSE and DMCA processes—they do not replace them.

## Trademark

“Supply Chain Attack Simulator” and **SCAS** refer to this project and its author’s educational work. Third-party use of the name to imply an official product or endorsement is discouraged; trademark registration may be pursued separately.

## Questions

- **How to cite / attribute:** [ATTRIBUTION.md](ATTRIBUTION.md)
- **Commercial or derivative doc use:** open a [GitHub Discussion](https://github.com/rajanagori/supply-chain-attack-simulator/discussions) or contact via [github.com/rajanagori](https://github.com/rajanagori)
