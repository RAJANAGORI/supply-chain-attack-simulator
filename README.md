# Supply Chain Attack Test Bench 🔐

A comprehensive cybersecurity learning platform for understanding, practicing, and defending against supply chain attacks.

## 🎯 Overview

This test bench provides hands-on practical scenarios to learn about supply chain attacks - one of the most critical and emerging threats in modern software development. Candidates will set up vulnerable environments, execute attacks, detect compromises, and implement defenses.

## 🚀 What You'll Learn

- **Typosquatting Attacks**: How attackers exploit package name confusion
- **Dependency Confusion**: Private vs public package resolution vulnerabilities
- **Compromised Packages**: How legitimate packages get hijacked
- **Malicious Updates**: Trojan horse updates to trusted packages
- **Build System Compromise**: CI/CD pipeline exploitation
- **Shai-Hulud Attack**: Self-replicating supply chain attacks with credential harvesting
- **Transitive Dependency Attacks**: Attacks through dependencies of dependencies
- **Package Lock File Manipulation**: Attacks through manipulated lock files
- **Package Signing Bypass**: Attacks through compromised signing keys
- **Git Submodule Attacks**: Attacks through malicious git submodules
- **Registry Mirror Poisoning**: Attacks through compromised internal mirrors (Enterprise-specific)
- **Workspace/Monorepo Attack**: Attacks through compromised workspace packages (Common in modern development)
- **Package Metadata Manipulation**: Spoofed metadata and tarball integrity mismatches
- **Container Image Supply Chain Attack**: Malicious image layers or startup exfiltration
- **Developer Tool Compromise**: Malicious IDE/CLI/dev-tool packages that execute during development
- **Package Cache Poisoning**: Poisoned local caches that persist across reinstalls
- **Multi-Stage Attack Chains**: Correlated, chained supply chain compromises across stages
- **Package Manager Plugin Attacks**: Malicious plugin hooks that tamper with installs
- **SBOM Manipulation Attacks**: Omitted/falsified dependency metadata in SBOM pipelines
- **Package Version Confusion**: Ambiguous version selection that installs attacker-controlled releases
- **Detection & Mitigation**: Practical tooling and defensive workflows across all scenarios

## 📋 Prerequisites

- **Operating System**: Linux, macOS, or Windows with WSL2
- **Software Requirements**:
  - Python 3.8+
  - Node.js 16+
  - Git
- **Knowledge Level**: Basic understanding of package managers (npm, pip, etc.)
- **Runtime model**: CLI-only (no dashboard/web UI required)

## 🏗️ Project Structure

```
testbench/
├── scenarios/                  # Attack scenario labs
│   ├── 01-typosquatting/      # Lab 1: Typosquatting attack
│   ├── 02-dependency-confusion/ # Lab 2: Dependency confusion
│   ├── 03-compromised-package/ # Lab 3: Package compromise
│   ├── 04-malicious-update/   # Lab 4: Update attacks
│   ├── 05-build-compromise/   # Lab 5: CI/CD compromise
│   ├── 06-sha-hulud/          # Lab 6: Self-replicating attack
│   ├── 07-transitive-dependency/ # Lab 7: Transitive dependency attack
│   ├── 08-package-lock-file-manipulation/ # Lab 8: Lock file manipulation
│   ├── 09-package-signing-bypass/ # Lab 9: Package signing bypass
│   ├── 10-git-submodule-attack/ # Lab 10: Git submodule attack
│   ├── 11-registry-mirror-poisoning/ # Lab 11: Registry mirror poisoning
│   ├── 12-workspace-monorepo-attack/ # Lab 12: Workspace/monorepo attack
│   ├── 13-package-metadata-manipulation/ # Lab 13: Package metadata manipulation
│   ├── 14-container-image-supply-chain-attack/ # Lab 14: Container image supply chain attack
│   ├── 15-developer-tool-compromise/ # Lab 15: Developer tool compromise
│   ├── 16-package-cache-poisoning/ # Lab 16: Package cache poisoning
│   ├── 17-multi-stage-attack-chain/ # Lab 17: Multi-stage attack chain
│   ├── 18-package-manager-plugin-attack/ # Lab 18: Package manager plugin attack
│   ├── 19-sbom-manipulation-attack/ # Lab 19: SBOM manipulation attack
│   └── 20-package-version-confusion/ # Lab 20: Package version confusion
├── vulnerable-apps/           # Sample vulnerable applications
│   ├── nodejs-app/           # Vulnerable Node.js application
│   ├── python-app/           # Vulnerable Python application
│   └── build-pipeline/       # Vulnerable CI/CD setup
├── malicious-packages/        # Example malicious packages (for learning)
├── detection-tools/          # Security scanning and detection tools
├── .github/ISSUE_TEMPLATE/   # GitHub issue forms
├── docs/                     # Detailed documentation
└── scripts/                  # Setup and utility scripts
```

## 🎓 New to This Project?

**If you're completely new and want step-by-step guidance:**

1. **Run the interactive starter script:**
   ```bash
   chmod +x START_HERE.sh
   ./START_HERE.sh
   ```

2. **Or read the complete beginner's guide:**
   ```bash
   cat docs/ZERO_TO_HERO.md
   ```

This guide will take you from zero knowledge to completing your first scenario with detailed explanations of every step.

## 🔧 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd testbench
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Run Scenario 1 (CLI)

```bash
cd scenarios/01-typosquatting
./setup.sh
node infrastructure/mock-server.js &
cd victim-app
npm install ../malicious-packages/request-lib
export TESTBENCH_MODE=enabled
npm start
curl http://localhost:3000/captured-data
```

### 4. Clean up the Scenario Port

```bash
sudo ./scripts/kill-port.sh 3000
```

## 📚 Scenario Overview

### Scenario 1: Typosquatting Attack (Beginner)
**Duration**: 30-45 minutes  
**Objective**: Create and exploit a typosquatted package to exfiltrate data  
**Skills**: Package creation, social engineering, data exfiltration

### Scenario 2: Dependency Confusion (Intermediate)
**Duration**: 45-60 minutes  
**Objective**: Exploit private/public package resolution to inject malicious code  
**Skills**: Package registry manipulation, scope confusion

### Scenario 3: Compromised Package (Intermediate)
**Duration**: 60 minutes  
**Objective**: Simulate account takeover and malicious package update  
**Skills**: Credential compromise, package hijacking

### Scenario 4: Malicious Update (Advanced)
**Duration**: 60-90 minutes  
**Objective**: Deploy a trojan update that appears legitimate  
**Skills**: Code obfuscation, persistence techniques

### Scenario 5: Build System Compromise (Advanced)
**Duration**: 90+ minutes  
**Objective**: Compromise CI/CD pipeline to inject backdoors  
**Skills**: Pipeline manipulation, artifact poisoning

### Scenario 6: Shai-Hulud Self-Replicating Attack (Expert)
**Duration**: 120+ minutes  
**Objective**: Understand and defend against self-replicating supply chain attacks  
**Skills**: Credential harvesting, post-install exploitation, forensic analysis, incident response  
**Description**: Learn about one of the most sophisticated supply chain attacks that compromised hundreds of npm packages. This scenario covers credential theft, self-replication mechanisms, and comprehensive incident response.

### Scenario 7: Transitive Dependency Attack (Intermediate)
**Duration**: 60-90 minutes  
**Objective**: Understand and defend against attacks through transitive dependencies  
**Skills**: Dependency tree analysis, transitive dependency auditing, detection techniques  
**Description**: Learn how attackers compromise packages that are dependencies of dependencies. This scenario demonstrates why transitive dependencies are hard to detect and how to audit entire dependency trees. Based on real-world attacks like event-stream → flatmap-stream (2018).

### Scenario 8: Package Lock File Manipulation (Intermediate)
**Duration**: 60-90 minutes  
**Objective**: Understand and defend against lock file manipulation attacks  
**Skills**: Lock file validation, integrity checking, CI/CD security  
**Description**: Learn how attackers manipulate package-lock.json to inject malicious packages. This scenario demonstrates why lock files are trusted by package managers and how to detect and prevent lock file tampering. Critical for CI/CD pipeline security.

### Scenario 9: Package Signing Bypass (Advanced)
**Duration**: 90+ minutes  
**Objective**: Understand and defend against signing bypass attacks through key compromise  
**Skills**: Signature verification, key management, key rotation, behavioral analysis  
**Description**: Learn how attackers compromise package signing keys to sign malicious packages. This scenario demonstrates why signature verification alone is insufficient and how to detect key compromise. Based on real-world attacks like SolarWinds (2020).

### Scenario 10: Git Submodule Attack (Intermediate)
**Duration**: 60-90 minutes  
**Objective**: Understand and defend against attacks through malicious git submodules  
**Skills**: Submodule validation, .gitmodules analysis, repository security  
**Description**: Learn how attackers add malicious git submodules to legitimate repositories. This scenario demonstrates how submodules can execute code automatically and how to detect and prevent submodule attacks.

### Scenario 11: Registry Mirror Poisoning (Advanced)
**Duration**: 90+ minutes  
**Objective**: Understand and defend against attacks through compromised registry mirrors  
**Skills**: Mirror validation, upstream verification, registry security  
**Description**: Learn how attackers compromise internal npm registry mirrors to serve malicious packages. This enterprise-specific scenario demonstrates why mirrors are single points of failure and how to validate mirror integrity. Critical for organizations using internal package registries.

### Scenario 12: Workspace/Monorepo Attack (Intermediate)
**Duration**: 60-90 minutes  
**Objective**: Understand and defend against attacks through compromised workspace packages  
**Skills**: Workspace security, monorepo auditing, postinstall monitoring  
**Description**: Learn how attackers compromise packages within npm workspaces or monorepos. This scenario demonstrates why workspace packages are a critical attack vector and how one compromised package can affect all packages in the workspace. Common in modern development with monorepo tools like Lerna, Nx, and Turborepo.

### Scenario 13: Package Metadata Manipulation (Intermediate)
**Duration**: 45-75 minutes  
**Objective**: Detect and defend against manipulated package metadata and tarball integrity mismatches  
**Skills**: Metadata validation, SBOM checks, registry verification  
**Description**: Attackers can spoof package metadata (repository, author, tarball URLs, integrity fields) to mislead consumers or redirect installs to malicious mirrors. This scenario shows how to detect inconsistencies and validate package provenance.

### Scenario 14: Container Image Supply Chain Attack (Advanced)
**Duration**: 60-120 minutes  
**Objective**: Detect malicious image layers and runtime exfiltration from container images  
**Skills**: Image layer inspection, image signing (cosign/notary), runtime monitoring  
**Description**: Demonstrates how a compromised base image or registry can introduce malicious layers that exfiltrate data at container startup. Learn static and runtime detection and CI/CD mitigations.

### Scenario 15: Developer Tool Compromise (Advanced)
**Duration**: 45-75 minutes  
**Objective**: Simulate compromised developer tools (IDE extensions/CLIs) that run malicious code during development.  
**Skills**: Build-time code execution, tool pinning, postinstall/suspicious script detection  
**Description**: Practice detecting “trusted tooling” compromise patterns and apply mitigations like isolation and signature/pinning checks.

### Scenario 16: Package Cache Poisoning (Intermediate)
**Duration**: 45-75 minutes  
**Objective**: Simulate poisoned local caches that persist across reinstalls.  
**Skills**: Cache integrity validation, persistence analysis, mitigation recommendations  
**Description**: Learn how attackers exploit caching layers and how to detect/clear poisoned artifacts safely.

### Scenario 17: Multi-Stage Attack Chain (Advanced)
**Duration**: 60-90 minutes  
**Objective**: Correlate evidence across a chained, multi-stage supply chain attack.  
**Skills**: Kill-chain thinking, evidence correlation, multi-step detection  
**Description**: Understand how early-stage compromises enable later-stage impact and why correlation is key.

### Scenario 18: Package Manager Plugin Attack (Advanced)
**Duration**: 45-75 minutes  
**Objective**: Simulate malicious package-manager plugins that intercept installs and inject payloads.  
**Skills**: Plugin hook auditing, build-tool isolation, injection marker detection  
**Description**: Practice isolating untrusted plugins and detecting installation-time tampering patterns.

### Scenario 19: SBOM Manipulation Attack (Advanced)
**Duration**: 45-75 minutes  
**Objective**: Simulate SBOM pipelines that omit malicious dependencies.  
**Skills**: SBOM authenticity checks, cross-verification, mismatch detection  
**Description**: Learn how to validate SBOM truth against dependency reality and detect omissions.

### Scenario 20: Package Version Confusion (Advanced)
**Duration**: 45-75 minutes  
**Objective**: Simulate version-selection ambiguity that installs an attacker’s high version.  
**Skills**: Version-selection heuristics, registry trust validation, pinning/lockfile guidance  
**Description**: Practice detecting suspicious version selection and enforcing deterministic installs.

## 🛡️ Defense & Detection

Each scenario includes:
- ✅ Detection techniques and tools
- ✅ Mitigation strategies
- ✅ Best practices for prevention
- ✅ Real-world case studies

## ⚠️ Safety & Ethics

**IMPORTANT**: This test bench is for **educational purposes only**.

- ✅ Use ONLY in isolated environments
- ✅ Never deploy malicious code to public repositories
- ✅ Do not test on systems you don't own
- ✅ Follow responsible disclosure practices

All malicious packages in this testbench are:
- Clearly labeled as educational
- Designed to work only in the test environment
- Incapable of causing real harm when used as instructed

## 🔒 Security Notice

This repository contains intentionally vulnerable code and malicious package examples for educational purposes. All examples include safeguards to prevent accidental deployment:

- Environment variable checks (requires `TESTBENCH_MODE=enabled`)
- Localhost-only operations
- Clear warning messages
- No actual credential harvesting

## 📖 Documentation

- **[Docs Map](docs/README.md)** - Organized index of all documentation
- **[Zero to Hero Guide](docs/ZERO_TO_HERO.md)** ⭐ **START HERE if you're new!**
- **[Supply Chain Attacks: Zero to Hero](docs/learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md)** - Landing page with progression path
- **[Scenario Learning Path](docs/learning-path/SCENARIO_LEARNING_PATH.md)** - Beginner/intermediate/advanced map with outcomes
- **[Module Template](docs/modules/MODULE_TEMPLATE.md)** - Reusable format for teaching any scenario
- **[Module Instances Index](docs/modules/MODULE_INSTANCES_INDEX.md)** - Quick links to scenario module files (01-20)
- **[All Scenario Module Instances](docs/modules/MODULE_INSTANCES_ALL_SCENARIOS.md)** - Ready-to-teach cards for scenarios 01-20
- **[Teaching Delivery Pack](docs/learning-path/TEACHING_DELIVERY_PACK.md)** - Talk/docs/course/simulator variants
- **[Capstone Rubric](docs/learning-path/CAPSTONE_RUBRIC.md)** - Final exercise and scoring criteria
- [Quick Reference Card](docs/QUICK_REFERENCE.md) - Essential commands cheat sheet
- [Complete Setup Guide](docs/SETUP.md)
- [Quick Start Guide](docs/QUICK_START.md)
- [Best Practices](docs/BEST_PRACTICES.md)
- [Scenario Walkthroughs](docs/SCENARIOS.md) - includes scenario-to-port mapping and port cleanup guidance
- [Additional Resources](docs/RESOURCES.md) - External links, articles, tools, and references

## 🧾 Issue Templates

GitHub issue forms are preconfigured under `.github/ISSUE_TEMPLATE`:
- `bug_report.yaml`
- `feature_request.yaml`
- `scenario_issue.yaml`

## 🎓 Learning Path

**Recommended Order**:
1. Read background material on supply chain attacks
2. Complete scenarios in order (1-6)
3. Review detection tools and techniques
4. Implement defenses in the vulnerable applications
5. Create your own attack scenario (capstone)

**Note**: Scenario 6 (Shai-Hulud) is the most advanced and should be attempted after completing scenarios 1-5, as it combines multiple attack vectors and requires understanding of incident response procedures. Scenarios 7-8, 10, 12, 13 are intermediate level. Scenarios 9, 11, 14 are advanced - Scenario 9 requires understanding of cryptographic signing, Scenario 11 is enterprise-specific (internal registries), and Scenario 14 requires familiarity with container tooling and image provenance. Scenario 12 is common in modern development and requires understanding of npm workspaces and monorepo structure.

## 🤝 Contributing

This is an educational project. Contributions are welcome:
- New attack scenarios
- Improved detection tools
- Better documentation
- Bug fixes and enhancements

## 📜 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Based on real-world supply chain attacks including:
- SolarWinds (2020)
- CodeCov (2021)
- Event-stream (2018)
- UA-Parser-js (2021)
- Colors.js & Faker.js (2022)

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check the troubleshooting guide
- Review the FAQ in docs/

---

**Remember**: With great power comes great responsibility. Use these skills to defend, not to harm.

🔐 Happy Learning!

