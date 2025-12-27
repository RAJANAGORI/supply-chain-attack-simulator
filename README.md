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
- **Package Lock File Manipulation**: Attacks through manipulated lock files
- **Transitive Dependency Attacks**: Attacks through dependencies of dependencies
- **Detection & Mitigation**: Tools and techniques to defend your supply chain

## 📋 Prerequisites

- **Operating System**: Linux, macOS, or Windows with WSL2
- **Software Requirements**:
  - Python 3.8+
  - Node.js 16+
  - Git
  - Docker & Docker Compose (optional, for advanced scenarios)
- **Knowledge Level**: Basic understanding of package managers (npm, pip, etc.)

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
│   └── 08-package-lock-file-manipulation/ # Lab 8: Lock file manipulation
│   └── 07-transitive-dependency/ # Lab 7: Transitive dependency attack
├── vulnerable-apps/           # Sample vulnerable applications
│   ├── nodejs-app/           # Vulnerable Node.js application
│   ├── python-app/           # Vulnerable Python application
│   └── build-pipeline/       # Vulnerable CI/CD setup
├── malicious-packages/        # Example malicious packages (for learning)
├── detection-tools/          # Security scanning and detection tools
├── docker/                   # Docker configurations
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

### 3. Begin Your First Scenario

```bash
cd scenarios/01-typosquatting
cat README.md  # Read the scenario instructions
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

### Scenario 8: Package Lock File Manipulation (Intermediate)
**Duration**: 60-90 minutes  
**Objective**: Understand and defend against lock file manipulation attacks  
**Skills**: Lock file validation, integrity checking, CI/CD security  
**Description**: Learn how attackers manipulate package-lock.json to inject malicious packages. This scenario demonstrates why lock files are trusted by package managers and how to detect and prevent lock file tampering. Critical for CI/CD pipeline security.
### Scenario 7: Transitive Dependency Attack (Intermediate)
**Duration**: 60-90 minutes  
**Objective**: Understand and defend against attacks through transitive dependencies  
**Skills**: Dependency tree analysis, transitive dependency auditing, detection techniques  
**Description**: Learn how attackers compromise packages that are dependencies of dependencies. This scenario demonstrates why transitive dependencies are hard to detect and how to audit entire dependency trees. Based on real-world attacks like event-stream → flatmap-stream (2018).

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

- **[Zero to Hero Guide](docs/ZERO_TO_HERO.md)** ⭐ **START HERE if you're new!**
- [Quick Reference Card](docs/QUICK_REFERENCE.md) - Essential commands cheat sheet
- [Complete Setup Guide](docs/SETUP.md)
- [Quick Start Guide](docs/QUICK_START.md)
- [Best Practices](docs/BEST_PRACTICES.md)
- [Scenario Walkthroughs](docs/SCENARIOS.md) (if exists)
- [Defense Strategies](docs/DEFENSE.md) (if exists)
- [Troubleshooting](docs/TROUBLESHOOTING.md) (if exists)
- [Additional Resources](docs/RESOURCES.md) (if exists)

## 🎓 Learning Path

**Recommended Order**:
1. Read background material on supply chain attacks
2. Complete scenarios in order (1-6)
3. Review detection tools and techniques
4. Implement defenses in the vulnerable applications
5. Create your own attack scenario (capstone)

**Note**: Scenario 6 (Shai-Hulud) is the most advanced and should be attempted after completing scenarios 1-5, as it combines multiple attack vectors and requires understanding of incident response procedures. Scenario 8 (Package Lock File Manipulation) is intermediate level and critical for CI/CD security.
**Note**: Scenario 6 (Shai-Hulud) is the most advanced and should be attempted after completing scenarios 1-5, as it combines multiple attack vectors and requires understanding of incident response procedures. Scenario 7 (Transitive Dependency) is intermediate level and can be completed after scenarios 1-3.

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

