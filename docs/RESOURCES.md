# Supply Chain Security Resources 📚

A curated collection of external resources, tools, articles, and references for learning about and defending against supply chain attacks.

## 🎯 Table of Contents

- [Real-World Attack Examples](#real-world-attack-examples)
- [Security Tools](#security-tools)
- [Research Papers & Articles](#research-papers--articles)
- [Industry Standards & Frameworks](#industry-standards--frameworks)
- [Educational Resources](#educational-resources)
- [Detection & Monitoring Tools](#detection--monitoring-tools)
- [Package Manager Security](#package-manager-security)
- [CI/CD Security](#cicd-security)
- [Container Security](#container-security)
- [Community & Forums](#community--forums)

---

## 🔥 Real-World Attack Examples

### Major Supply Chain Attacks

- **SolarWinds (2020)**
  - [CISA Advisory](https://www.cisa.gov/news-events/cybersecurity-advisories/aa20-352a)
  - [Microsoft Analysis](https://www.microsoft.com/security/blog/2020/12/18/analyzing-solarwinds-orion-code-compromise/)
  - Impact: 18,000+ organizations affected

- **CodeCov (2021)**
  - [CodeCov Incident Report](https://about.codecov.io/security-update/)
  - [GitHub Advisory](https://github.blog/2021-04-15-codecov-security-update/)
  - Impact: Thousands of repositories compromised

- **Event-stream (2018)**
  - [npm Security Advisory](https://github.com/advisories/GHSA-9c47-m6xx-74q2)
  - [Analysis by Snyk](https://snyk.io/blog/compromised-npm-package-event-stream/)
  - Impact: 8 million+ downloads affected

- **UA-Parser-js (2021)**
  - [npm Security Advisory](https://www.npmjs.com/advisories/1678)
  - [GitHub Security Advisory](https://github.com/advisories/GHSA-pjwm-rvh2-cm6p)
  - Impact: Credential theft and cryptocurrency mining

- **Colors.js & Faker.js (2022)**
  - [npm Incident Report](https://status.npmjs.org/incidents/1y0h5k1qjq1t)
  - [Analysis](https://www.bleepingcomputer.com/news/security/dev-corrupts-npm-libs-colors-and-faker-breaking-thousands-of-apps/)
  - Impact: Thousands of applications broken

### Dependency Confusion Attacks

- **Alex Birsan's Research (2021)**
  - [Blog Post: Dependency Confusion](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
  - [HackerOne Report](https://hackerone.com/reports/1192477)
  - Impact: $130,000+ in bug bounties, affected Apple, Microsoft, Tesla, and 30+ companies

---

## 🛠️ Security Tools

### Package Scanning & Analysis

- **Snyk**
  - Website: https://snyk.io/
  - Features: Vulnerability scanning, license compliance, dependency analysis
  - Free tier available

- **GitHub Dependabot**
  - Website: https://github.com/dependabot
  - Features: Automated dependency updates, security alerts
  - Free for public repositories

- **npm audit**
  - Built into npm
  - Command: `npm audit` / `npm audit fix`
  - Features: Vulnerability scanning for npm packages

- **OWASP Dependency-Check**
  - Website: https://owasp.org/www-project-dependency-check/
  - Features: Open-source dependency vulnerability scanner
  - Supports multiple languages

- **WhiteSource / Mend**
  - Website: https://www.mend.io/
  - Features: Open-source security and license compliance
  - Enterprise-focused

### SBOM (Software Bill of Materials) Tools

- **CycloneDX**
  - Website: https://cyclonedx.org/
  - Features: SBOM standard and tooling
  - Supports multiple package managers

- **SPDX**
  - Website: https://spdx.dev/
  - Features: Software Package Data Exchange standard
  - Industry standard for SBOM

- **Syft**
  - Website: https://github.com/anchore/syft
  - Features: CLI tool for generating SBOMs
  - Supports containers, filesystems, archives

### Package Verification

- **npm package signing**
  - Documentation: https://docs.npmjs.com/about-package-signing
  - Features: Package integrity verification
  - Built into npm

- **GPG/PGP Tools**
  - Website: https://www.gnupg.org/
  - Features: Cryptographic signing and verification
  - Industry standard

### Container Security

- **Trivy**
  - Website: https://aquasecurity.github.io/trivy/
  - Features: Container vulnerability scanning
  - Free and open-source

- **Clair**
  - Website: https://github.com/quay/clair
  - Features: Container vulnerability analysis
  - Open-source

- **Docker Scout**
  - Website: https://docs.docker.com/scout/
  - Features: Container security scanning
  - Integrated with Docker

---

## 📄 Research Papers & Articles

### Academic Research

- **"A Large-Scale Empirical Study of Security Issues in Package Managers"**
  - Authors: Kula et al.
  - Conference: MSR 2018
  - Focus: npm and RubyGems security analysis

- **"Backstabber's Knife Collection: A Review of Open Source Software Supply Chain Security"**
  - Authors: Ohm et al.
  - Conference: NDSS 2020
  - Focus: Comprehensive supply chain security review

- **"The Attack of the Clones: A Study of the Impact of Shared Code on Vulnerability Patching"**
  - Authors: Kula et al.
  - Conference: ICSE 2018
  - Focus: Shared code vulnerabilities

### Industry Articles

- **OWASP Top 10 CI/CD Security Risks**
  - Website: https://owasp.org/www-project-top-10-ci-cd-security-risks/
  - Focus: CI/CD pipeline security

- **NIST Software Supply Chain Security Guidelines**
  - Website: https://www.nist.gov/itl/executive-order-improving-nations-cybersecurity
  - Focus: Federal guidelines for supply chain security

- **GitHub Security Best Practices**
  - Website: https://docs.github.com/en/code-security
  - Focus: Repository and dependency security

---

## 🏛️ Industry Standards & Frameworks

### Security Frameworks

- **SLSA (Supply-chain Levels for Software Artifacts)**
  - Website: https://slsa.dev/
  - Focus: Framework for securing software supply chains
  - Levels: 1-4 (increasing security)

- **NIST Cybersecurity Framework**
  - Website: https://www.nist.gov/cyberframework
  - Focus: Comprehensive cybersecurity framework
  - Includes supply chain considerations

- **ISO/IEC 27001**
  - Website: https://www.iso.org/isoiec-27001-information-security.html
  - Focus: Information security management
  - Includes supply chain security controls

- **CIS Controls**
  - Website: https://www.cisecurity.org/controls/
  - Focus: Critical security controls
  - Includes supply chain security

### SBOM Standards

- **SPDX**
  - Website: https://spdx.dev/
  - Standard: ISO/IEC 5962:2021
  - Focus: Software Package Data Exchange

- **CycloneDX**
  - Website: https://cyclonedx.org/
  - Standard: OWASP standard
  - Focus: SBOM format and tooling

---

## 🎓 Educational Resources

### Courses & Training

- **OWASP WebGoat**
  - Website: https://owasp.org/www-project-webgoat/
  - Focus: Web application security training
  - Includes dependency vulnerabilities

- **Secure Code Warrior**
  - Website: https://www.securecodewarrior.com/
  - Focus: Secure coding training
  - Includes supply chain security modules

- **SANS Training**
  - Website: https://www.sans.org/
  - Courses: Software security, supply chain security
  - Professional training

### Documentation & Guides

- **npm Security Best Practices**
  - Website: https://docs.npmjs.com/security-best-practices
  - Focus: npm-specific security guidance

- **Python Package Security**
  - Website: https://packaging.python.org/guides/security/
  - Focus: PyPI and pip security

- **Rust Security Advisory Database**
  - Website: https://rustsec.org/
  - Focus: Rust crate security advisories

---

## 🔍 Detection & Monitoring Tools

### Dependency Monitoring

- **Renovate**
  - Website: https://github.com/renovatebot/renovate
  - Features: Automated dependency updates
  - Open-source

- **Dependabot**
  - Website: https://github.com/dependabot
  - Features: Automated dependency updates
  - GitHub-native

- **Snyk Open Source**
  - Website: https://snyk.io/opensource/
  - Features: Open-source vulnerability scanning
  - Free tier available

### Behavioral Analysis

- **Falco**
  - Website: https://falco.org/
  - Features: Runtime security monitoring
  - Container-focused

- **Sysdig Secure**
  - Website: https://sysdig.com/products/secure/
  - Features: Container security and compliance
  - Enterprise-focused

---

## 📦 Package Manager Security

### npm Security

- **npm Security Documentation**
  - Website: https://docs.npmjs.com/security
  - Topics: Package signing, 2FA, security policies

- **npm Security Advisories**
  - Website: https://github.com/advisories?query=ecosystem%3Anpm
  - Focus: npm package security advisories

- **npm Audit**
  - Documentation: https://docs.npmjs.com/cli/v8/commands/npm-audit
  - Features: Vulnerability scanning

### Python Security

- **PyPI Security**
  - Website: https://pypi.org/security/
  - Focus: PyPI security best practices

- **Safety**
  - Website: https://pyup.io/safety/
  - Features: Python dependency vulnerability scanning

- **pip-audit**
  - Website: https://pypi.org/project/pip-audit/
  - Features: Python package vulnerability scanning

### Other Package Managers

- **RubyGems Security**
  - Website: https://guides.rubygems.org/security/
  - Focus: Ruby gem security

- **Maven Security**
  - Website: https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html
  - Focus: Maven dependency security

- **Go Modules Security**
  - Website: https://go.dev/ref/mod
  - Focus: Go module security

---

## 🔄 CI/CD Security

### CI/CD Security Tools

- **GitLab Security Scanning**
  - Website: https://docs.gitlab.com/ee/user/application_security/
  - Features: Integrated security scanning

- **GitHub Advanced Security**
  - Website: https://docs.github.com/en/enterprise-cloud@latest/code-security
  - Features: Code scanning, secret scanning, dependency review

- **Jenkins Security**
  - Website: https://www.jenkins.io/doc/book/security/
  - Focus: Jenkins pipeline security

- **CircleCI Security**
  - Website: https://circleci.com/docs/security/
  - Focus: CI/CD pipeline security

### Secrets Management

- **HashiCorp Vault**
  - Website: https://www.vaultproject.io/
  - Features: Secrets management
  - Open-source

- **AWS Secrets Manager**
  - Website: https://aws.amazon.com/secrets-manager/
  - Features: Cloud secrets management

- **GitHub Secrets**
  - Website: https://docs.github.com/en/actions/security-guides/encrypted-secrets
  - Features: Encrypted secrets for CI/CD

---

## 🐳 Container Security

### Container Scanning

- **Trivy**
  - Website: https://aquasecurity.github.io/trivy/
  - Features: Comprehensive container scanning
  - Free and open-source

- **Clair**
  - Website: https://github.com/quay/clair
  - Features: Container vulnerability analysis
  - Open-source

- **Anchore Engine**
  - Website: https://github.com/anchore/anchore-engine
  - Features: Container image analysis
  - Open-source

### Container Registries

- **Docker Hub Security**
  - Website: https://docs.docker.com/docker-hub/security-scanning/
  - Features: Image scanning

- **Harbor**
  - Website: https://goharbor.io/
  - Features: Container registry with security scanning
  - Open-source

---

## 👥 Community & Forums

### Security Communities

- **OWASP Community**
  - Website: https://owasp.org/
  - Focus: Application security community
  - Local chapters worldwide

- **GitHub Security Advisories**
  - Website: https://github.com/advisories
  - Focus: Security advisories for open-source projects

- **CVE Database**
  - Website: https://cve.mitre.org/
  - Focus: Common Vulnerabilities and Exposures database

- **National Vulnerability Database (NVD)**
  - Website: https://nvd.nist.gov/
  - Focus: U.S. government vulnerability database

### Discussion Forums

- **Stack Overflow - Security**
  - Website: https://stackoverflow.com/questions/tagged/security
  - Focus: Security Q&A

- **Reddit - r/netsec**
  - Website: https://www.reddit.com/r/netsec/
  - Focus: Network security discussions

- **Reddit - r/cybersecurity**
  - Website: https://www.reddit.com/r/cybersecurity/
  - Focus: General cybersecurity discussions

---

## 📰 News & Updates

### Security News Sources

- **The Hacker News**
  - Website: https://thehackernews.com/
  - Focus: Cybersecurity news

- **Bleeping Computer**
  - Website: https://www.bleepingcomputer.com/
  - Focus: Technology and security news

- **Krebs on Security**
  - Website: https://krebsonsecurity.com/
  - Focus: In-depth security journalism

### Security Advisories

- **CISA Advisories**
  - Website: https://www.cisa.gov/news-events/cybersecurity-advisories
  - Focus: U.S. government security advisories

- **US-CERT**
  - Website: https://www.cisa.gov/us-cert
  - Focus: Cybersecurity alerts and advisories

---

## 🔗 Quick Reference Links

### Essential Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - npm vulnerability scanner
- [Snyk](https://snyk.io/) - Multi-language security scanning
- [Dependabot](https://github.com/dependabot) - Automated dependency updates
- [Trivy](https://aquasecurity.github.io/trivy/) - Container scanning

### Standards & Frameworks
- [SLSA](https://slsa.dev/) - Supply chain security framework
- [SPDX](https://spdx.dev/) - SBOM standard
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks

### Learning Resources
- [OWASP WebGoat](https://owasp.org/www-project-webgoat/) - Security training
- [npm Security Docs](https://docs.npmjs.com/security) - npm security guide
- [GitHub Security](https://docs.github.com/en/code-security) - GitHub security docs

---

## 📝 Contributing

Found a great resource? Contributions welcome! Please ensure resources are:
- Relevant to supply chain security
- Up-to-date and actively maintained
- Free/open-source or clearly marked as commercial
- Educational and informative

---

**Last Updated**: 2024

🔐 Stay secure, stay informed!
