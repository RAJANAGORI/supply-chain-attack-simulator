# Scenario Learning Path (Beginner -> Intermediate -> Advanced)

Use this page to decide what to teach next based on team maturity.  
Each track is ordered so people build confidence first, then move into harder detection and response work.

## Beginner Track

Start here when the audience is new to supply chain security labs.

### Scenario 01: Typosquatting

- **Path**: `scenarios/01-typosquatting/`
- **Outcome**: identify typo-driven package risk and capture first compromise evidence.

### Scenario 02: Dependency Confusion

- **Path**: `scenarios/02-dependency-confusion/`
- **Outcome**: explain private/public resolution abuse and apply scope registry controls.

### Scenario 03: Compromised Package

- **Path**: `scenarios/03-compromised-package/`
- **Outcome**: recognize trusted-package compromise patterns and initial containment actions.

## Intermediate Track

Move here once learners can run a lab independently and explain basic attack mechanics.

### Scenario 04: Malicious Update

- **Path**: `scenarios/04-malicious-update/`
- **Outcome**: detect risky update behavior and enforce safer update strategy.

### Scenario 07: Transitive Dependency Attack

- **Path**: `scenarios/07-transitive-dependency/`
- **Outcome**: audit deep dependency trees and surface transitive risk signals.

### Scenario 08: Package Lock File Manipulation

- **Path**: `scenarios/08-package-lock-file-manipulation/`
- **Outcome**: validate lockfile tampering signals and enforce deterministic installs.

### Scenario 10: Git Submodule Attack

- **Path**: `scenarios/10-git-submodule-attack/`
- **Outcome**: detect untrusted submodules and harden repository trust boundaries.

### Scenario 12: Workspace/Monorepo Attack

- **Path**: `scenarios/12-workspace-monorepo-attack/`
- **Outcome**: identify workspace trust abuse and add monorepo-specific controls.

### Scenario 13: Package Metadata Manipulation

- **Path**: `scenarios/13-package-metadata-manipulation/`
- **Outcome**: validate package metadata integrity against expected provenance.

### Scenario 16: Package Cache Poisoning

- **Path**: `scenarios/16-package-cache-poisoning/`
- **Outcome**: detect persistence through caches and implement safe cache hygiene.

## Advanced Track

Use these modules for deeper engineering teams who need production-grade detection and policy outcomes.

### Scenario 05: Build Compromise

- **Path**: `scenarios/05-build-compromise/`
- **Outcome**: trace build-stage tampering and define CI/CD trust controls.

### Scenario 06: SHA-Hulud

- **Path**: `scenarios/06-sha-hulud/`
- **Outcome**: analyze self-propagating attack behavior and incident-response priorities.

### Scenario 09: Package Signing Bypass

- **Path**: `scenarios/09-package-signing-bypass/`
- **Outcome**: understand signing limitations and enforce key/provenance safeguards.

### Scenario 11: Registry Mirror Poisoning

- **Path**: `scenarios/11-registry-mirror-poisoning/`
- **Outcome**: detect poisoned mirrors and enforce upstream verification policy.

### Scenario 14: Container Image Supply Chain Attack

- **Path**: `scenarios/14-container-image-supply-chain-attack/`
- **Outcome**: detect malicious image layers and improve runtime/image controls.

### Scenario 15: Developer Tool Compromise

- **Path**: `scenarios/15-developer-tool-compromise/`
- **Outcome**: control trust in IDE/CLI tooling and reduce build-time execution risk.

### Scenario 17: Multi-Stage Attack Chain

- **Path**: `scenarios/17-multi-stage-attack-chain/`
- **Outcome**: correlate evidence across stages and prioritize coordinated response.

### Scenario 18: Package Manager Plugin Attack

- **Path**: `scenarios/18-package-manager-plugin-attack/`
- **Outcome**: audit plugin hooks and isolate plugin execution trust.

### Scenario 19: SBOM Manipulation Attack

- **Path**: `scenarios/19-sbom-manipulation-attack/`
- **Outcome**: verify SBOM authenticity and detect omissions/mismatches.

### Scenario 20: Package Version Confusion

- **Path**: `scenarios/20-package-version-confusion/`
- **Outcome**: detect resolver drift and enforce strict version-selection policy.

## Suggested Progression

1. Beginner: 01 -> 02 -> 03  
2. Intermediate: 04 -> 07 -> 08 -> 10 -> 12 -> 13 -> 16  
3. Advanced: 05 -> 06 -> 09 -> 11 -> 14 -> 15 -> 17 -> 18 -> 19 -> 20  

## Exit Criteria By Level

- **Beginner exit**: can run a scenario safely and explain one concrete detection signal.
- **Intermediate exit**: can correlate static + behavioral evidence and apply policy-level mitigations.
- **Advanced exit**: can design layered CI/runtime controls and justify incident-response decisions.

## Facilitator Tip

If your audience is mixed, run one beginner module first (usually Scenario 01), then jump to one advanced module (usually Scenario 20) to show how the same trust-edge model scales.
