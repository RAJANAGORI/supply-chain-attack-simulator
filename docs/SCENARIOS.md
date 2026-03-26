# Scenario Walkthroughs

This file provides a concise reference for each scenario included in the testbench. For full step-by-step labs, open the README in each scenario folder (scenarios/NN-*/README.md).

## Scenario index

1. Scenario 01 — Typosquatting Attack (Beginner)  
   Path: `scenarios/01-typosquatting/`  
   Skills: package creation, name-squatting, basic exfiltration

2. Scenario 02 — Dependency Confusion (Intermediate)  
   Path: `scenarios/02-dependency-confusion/`  
   Skills: registry resolution, private vs public package handling

3. Scenario 03 — Compromised Package (Intermediate)  
   Path: `scenarios/03-compromised-package/`  
   Skills: account takeover simulation, malicious update delivery

4. Scenario 04 — Malicious Update (Advanced)  
   Path: `scenarios/04-malicious-update/`  
   Skills: trojan update delivery, persistence techniques

5. Scenario 05 — Build System Compromise (Advanced)  
   Path: `scenarios/05-build-compromise/`  
   Skills: CI/CD compromise, artifact poisoning

6. Scenario 06 — Shai-Hulud Self-Replicating Attack (Expert)  
   Path: `scenarios/06-sha-hulud/`  
   Skills: credential harvesting, self-replication, incident response

7. Scenario 07 — Transitive Dependency Attack (Intermediate)  
   Path: `scenarios/07-transitive-dependency/`  
   Skills: dependency tree analysis, transitive auditing

8. Scenario 08 — Package Lock File Manipulation (Intermediate)  
   Path: `scenarios/08-package-lock-file-manipulation/`  
   Skills: lockfile validation, CI/CD integrity checks

9. Scenario 09 — Package Signing Bypass (Advanced)  
   Path: `scenarios/09-package-signing-bypass/`  
   Skills: signature verification, key management

10. Scenario 10 — Git Submodule Attack (Intermediate)  
    Path: `scenarios/10-git-submodule-attack/`  
    Skills: submodule validation, repository hygiene

11. Scenario 11 — Registry Mirror Poisoning (Advanced)  
    Path: `scenarios/11-registry-mirror-poisoning/`  
    Skills: mirror validation, upstream verification (enterprise focus)

12. Scenario 12 — Workspace / Monorepo Attack (Intermediate)  
    Path: `scenarios/12-workspace-monorepo-attack/`  
    Skills: npm workspace security, monorepo auditing

13. Scenario 13 — Package Metadata Manipulation (Intermediate)  
    Path: `scenarios/13-package-metadata-manipulation/`  
    Skills: metadata validation, SBOM checks, registry provenance

14. Scenario 14 — Container Image Supply Chain Attack (Advanced)  
    Path: `scenarios/14-container-image-supply-chain-attack/`  
    Skills: image layer inspection, image signing, runtime monitoring

15. Scenario 15 — Developer Tool Compromise (Advanced)  
    Path: `scenarios/15-developer-tool-compromise/`  
    Skills: build-time/code-execution analysis, tool pinning, detection of suspicious `postinstall`

16. Scenario 16 — Package Cache Poisoning (Intermediate)  
    Path: `scenarios/16-package-cache-poisoning/`  
    Skills: cache integrity validation, persistence across reinstalls, mitigation recommendations

17. Scenario 17 — Multi-Stage Attack Chain (Advanced)  
    Path: `scenarios/17-multi-stage-attack-chain/`  
    Skills: correlating evidence across stages, kill-chain thinking, multi-step detection

18. Scenario 18 — Package Manager Plugin Attack (Advanced)  
    Path: `scenarios/18-package-manager-plugin-attack/`  
    Skills: plugin hook auditing, isolating build tooling, detecting injection markers

19. Scenario 19 — SBOM Manipulation Attack (Advanced)  
    Path: `scenarios/19-sbom-manipulation-attack/`  
    Skills: SBOM authenticity checks, cross-verification, mismatch detection

20. Scenario 20 — Package Version Confusion (Advanced)  
    Path: `scenarios/20-package-version-confusion/`  
    Skills: version-selection heuristics, registry trust validation, pinning/lockfile guidance

---

Tip: Use `cat scenarios/NN-name/README.md` to open scenario instructions. Each scenario includes a `setup.sh`, mock infrastructure, detection tools, and recommended exercises. For a short walkthrough, see `docs/ZERO_TO_HERO_SCENARIO_NN.md`; for command cheat sheets, see `docs/QUICK_REFERENCE_SCENARIO_NN.md` (replace `NN` with the scenario number).

## Port Cleanup (free ports between scenarios)

After finishing a scenario, free the port(s) used by that scenario's mock attacker server(s) to avoid `EADDRINUSE` / “port already in use” errors on the next run.

Run:

```bash
sudo ./scripts/kill-port.sh <PORT>
```