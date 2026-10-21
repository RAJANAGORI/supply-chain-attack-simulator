# Supply Chain Security Resources 📚

A curated collection of external resources, tools, articles, and references for learning about and defending against supply chain attacks.

## 🎯 Table of Contents

- [Real-World Attack Examples](#real-world-attack-examples)
- [Real incidents by lab](#real-incidents-by-lab)
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

Primary reports and advisories. The old npm advisory ids, the Codecov GitHub Blog slug, and the npm status incident page in the previous list no longer resolve.

### Vendor software and build pipelines

#### SolarWinds / SUNBURST (2020)
- [CISA advisory AA20-352A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa20-352a)
- [Microsoft: analyzing the compromised DLL](https://www.microsoft.com/en-us/security/blog/2020/12/18/analyzing-solorigate-the-compromised-dll-file-that-started-a-sophisticated-cyberattack-and-how-microsoft-defender-helps-protect/)
- [Mandiant: SUNBURST](https://cloud.google.com/blog/topics/threat-intelligence/evasive-attacker-leverages-solarwinds-supply-chain-compromises-with-sunburst-backdoor)
- A trojanized Orion update carried a backdoor into customer networks.

#### Codecov (2021)
- [Codecov security update](https://about.codecov.io/security-update/)
- [Codecov post-mortem](https://about.codecov.io/apr-2021-post-mortem/)
- [CISA alert](https://www.cisa.gov/news-events/alerts/2021/04/22/codecov-releases-security-update)
- The Bash Uploader was modified so CI environment variables could be sent off the runner.

#### 3CX (2023)
- [Mandiant: the desktop app, and the earlier installer that led there](https://cloud.google.com/blog/topics/threat-intelligence/3cx-software-supply-chain-compromise)
- A trojanized desktop app. The intrusion into 3CX started from a previously trojanized installer.

#### XZ Utils (2024)
- [Disclosure on oss-security (Andres Freund)](https://www.openwall.com/lists/oss-security/2024/03/29/4)
- [CISA alert, CVE-2024-3094](https://www.cisa.gov/news-events/alerts/2024/03/29/reported-supply-chain-compromise-affecting-xz-utils-data-compression-library-cve-2024-3094)
- [CISA: what the near-miss showed](https://www.cisa.gov/news-events/news/lessons-xz-utils-achieving-more-sustainable-open-source-ecosystem)
- A backdoor in xz 5.6.0 and 5.6.1 was hidden in the release tarball and caught before it rolled out widely.

### Package registries

#### eslint-scope (2018)
- [ESLint postmortem](https://eslint.org/blog/2018/07/postmortem-for-malicious-package-publishes/)
- A stolen maintainer account published `eslint-scope@3.7.2`, which read `.npmrc` tokens on install.

#### event-stream (2018)
- [npm incident report](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident)
- [GitHub Advisory GHSA-mh6f-8j2x-4483](https://github.com/advisories/GHSA-mh6f-8j2x-4483)
- [Maintainer thread](https://github.com/dominictarr/event-stream/issues/116)
- `flatmap-stream` was added to `event-stream@3.3.6` and targeted Copay wallets.

#### Octopus Scanner (2020)
- [GitHub Security Lab](https://github.blog/security/vulnerability-research/the-octopus-scanner-malware-attacking-the-open-source-supply-chain/)
- Malware in NetBeans projects patched the build so the output JAR stayed infected.

#### ua-parser-js (2021)
- [GitHub Advisory GHSA-pjwm-rvh2-c87w](https://github.com/advisories/GHSA-pjwm-rvh2-c87w)
- [CISA alert](https://www.cisa.gov/news-events/alerts/2021/10/22/malware-discovered-popular-npm-package-ua-parser-js)
- [Maintainer issue](https://github.com/faisalman/ua-parser-js/issues/536)
- Versions 0.7.29, 0.8.0, and 1.0.0 ran a miner and a credential stealer. CVE-2021-4229.

#### coa and rc (2021)
- [GitHub Advisory for coa](https://github.com/advisories/GHSA-73qr-pfmq-6rp8)
- [GitHub Advisory for rc](https://github.com/advisories/GHSA-g2q5-5433-rhrf)
- [Sonatype writeup](https://www.sonatype.com/blog/npm-hijackers-at-it-again-popular-coa-and-rc-open-source-libraries-taken-over-to-spread-malware)
- Hijacked publishes of both packages ran an install script that downloaded a credential stealer.

#### colors.js and faker.js (2022)
- [Snyk: both packages](https://snyk.io/blog/open-source-npm-packages-colors-faker/)
- [GitHub Advisory for faker 6.6.6](https://github.com/advisories/GHSA-5w9c-rv96-fr7g)
- [Sonatype writeup](https://www.sonatype.com/blog/npm-libraries-colors-and-faker-sabotaged-in-protest-by-their-maintainer-what-to-do-now)
- The maintainer shipped a `colors` release that loops forever, and a `faker` release with the library removed.

#### node-ipc (2022)
- [Snyk: peacenotwar](https://snyk.io/blog/peacenotwar-malicious-npm-node-ipc-package-vulnerability/)
- [GitHub Advisory GHSA-97m3-w2cp-4xx6](https://github.com/advisories/GHSA-97m3-w2cp-4xx6)
- The maintainer added protestware. Some versions wiped files. CVE-2022-23812.

#### ctx (PyPI, 2022)
- [PyPA advisory PYSEC-2022-199](https://github.com/pypa/advisory-database/blob/main/vulns/ctx/PYSEC-2022-199.yaml)
- The PyPI project was taken over through the maintainer account and replaced with a credential stealer.

#### chalk, debug, and Shai-Hulud (2025)
- [AWS: the chalk/debug publishes and the worm that followed](https://aws.amazon.com/blogs/security/defending-against-supply-chain-attacks-like-chalk-debug-and-the-shai-hulud-worm/)
- [StepSecurity: the worm in @ctrl/tinycolor and other npm packages](https://www.stepsecurity.io/blog/ctrl-tinycolor-and-40-npm-packages-compromised)
- [Cyber Security Agency of Singapore](https://www.csa.gov.sg/alerts-and-advisories/alerts/al-2025-093/)
- Stolen maintainer credentials were used to republish popular packages. A follow-on worm harvested tokens and kept publishing.

### Names, tags, and third-party scripts

#### Dependency confusion (2021)
- [Alex Birsan, "Dependency Confusion"](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
- [Microsoft CVE-2021-24105](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-24105)
- Public packages reused the names of private packages, and misconfigured builds installed the public ones. Birsan reported this to Apple, Microsoft, and other companies.

#### polyfill.io (2024)
- [Sansec](https://sansec.io/research/polyfill-supply-chain-attack)
- [Cloudflare](https://blog.cloudflare.com/automatically-replacing-polyfill-io-links-with-cloudflares-mirror-for-a-safer-internet/)
- [ReversingLabs](https://www.reversinglabs.com/blog/the-pollyfillio-supply-chain-attack-lessons-learned)
- After the domain changed hands, the CDN script included on other sites was modified.

#### tj-actions/changed-files and reviewdog (2025)
- [CISA alert](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction)
- [GitHub Advisory GHSA-mrrh-fwg8-r2c3](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)
- [StepSecurity](https://www.stepsecurity.io/blog/harden-runner-detection-tj-actions-changed-files-action-is-compromised)
- Action tags were moved to a commit that printed CI secrets into workflow logs. CVE-2025-30066 and CVE-2025-30154.

### Real incidents by lab

Each lab is a local copy of a shape that already showed up in public. Where the match is a specific breach, the link is that breach. Where it is not, the note says so. I did not invent a headline to fill a row.

| Lab | Public case | Read |
|---|---|---|
| 01 Typosquatting | In 2017, `crossenv` was published as a lookalike of `cross-env`. The install script read environment variables. | [npm incident note](https://blog.npmjs.org/post/163723642530/crossenv-malware-on-the-npm-registry) |
| 02 Dependency confusion | Alex Birsan published public packages whose names matched private ones. Misconfigured builds installed the public package. | [His writeup](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610), [Microsoft CVE-2021-24105](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-24105) |
| 03 Compromised package | A new maintainer of `event-stream` added `flatmap-stream`, which targeted Copay wallets. | [npm incident report](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident) |
| 04 Malicious update | `ua-parser-js` was a name people already depended on. Hijacked versions 0.7.29, 0.8.0, and 1.0.0 were the bad publish. | [GitHub Advisory](https://github.com/advisories/GHSA-pjwm-rvh2-c87w) |
| 05 Build compromise | Codecov's Bash Uploader, the script CI ran to upload coverage, was modified for months. | [Codecov post-mortem](https://about.codecov.io/apr-2021-post-mortem/) |
| 06 Shai-Hulud | The 2025 npm worm stole maintainer tokens and republished other packages with the same payload. | [StepSecurity](https://www.stepsecurity.io/blog/ctrl-tinycolor-and-40-npm-packages-compromised) |
| 07 Transitive dependency | `node-ipc` was pulled in by Vue CLI. People who never typed that name still ran the payload. | [Snyk](https://snyk.io/blog/peacenotwar-malicious-npm-node-ipc-package-vulnerability/) |
| 08 Lockfile manipulation | I could not verify a public breach whose only trick was a hand-edited lockfile. The cases that change what `npm ci` installs are the bad publishes above, once a range accepts them. | [ua-parser-js advisory](https://github.com/advisories/GHSA-pjwm-rvh2-c87w) |
| 09 Signing bypass | ASUS Live Update shipped a trojanized build that was signed with a trusted ASUS certificate. The signature said who signed it. It did not say the code was honest. | [Kaspersky, Operation ShadowHammer](https://securelist.com/operation-shadowhammer/89992/) |
| 10 Git submodule | CVE-2022-39253. A local clone could be talked into fetching a submodule from a path the attacker chose. | [Git security release notes](https://github.blog/open-source/git/git-security-vulnerabilities-announced/) |
| 11 Registry mirror | I could not verify a postmortem where a mirror rewrote the bytes of a package you had already pinned. The public cases are a trusted feed returning a different package, which is dependency confusion. | [Birsan](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610) |
| 12 Workspace / monorepo | Malicious versions of Nx, a monorepo tool, were published after a GitHub Actions bug leaked the npm token. | [Nx postmortem](https://nx.dev/blog/s1ngularity-postmortem) |
| 13 Metadata manipulation | npm did not check that the published manifest matched the tarball. Hidden dependencies and install scripts were possible. JFrog later found mostly proofs of concept, not a widespread crime. | [JFrog, six months later](https://jfrog.com/blog/npm-manifest-confusion-six-months-later/) |
| 14 Container image | Public images on Docker Hub were already carrying miners, backdoors, and secret stealers. Sysdig counted them. | [Sysdig](https://www.sysdig.com/blog/analysis-of-supply-chain-attacks-through-public-docker-images) |
| 15 Developer tool | An ESLint maintainer's npm account was stolen. `eslint-scope@3.7.2` sent `.npmrc` tokens to the attacker on install. | [ESLint postmortem](https://eslint.org/blog/2018/07/postmortem-for-malicious-package-publishes/) |
| 16 Package cache | A researcher showed that a poisoned GitHub Actions cache can be reused by later jobs that trust it. This was demonstrated against real workflows, not written up as a criminal campaign. | [Adnan Khan](https://adnanthekhan.com/2023/12/20/one-supply-chain-attack-to-rule-them-all/) |
| 17 Multi-stage chain | The 3CX desktop app was trojanized. Mandiant then found that 3CX had been entered through an earlier trojanized installer, X_TRADER. | [Mandiant](https://cloud.google.com/blog/topics/threat-intelligence/3cx-software-supply-chain-compromise) |
| 18 Package manager hook | I could not verify a public breach that used a poisoned `pnpmfile`. The same class of bug is an install hook the developer did not review. `eslint-scope` is that case. | [ESLint postmortem](https://eslint.org/blog/2018/07/postmortem-for-malicious-package-publishes/) |
| 19 SBOM manipulation | I could not verify a named breach where the generator deleted one package from an SBOM. The public failure is an inventory that does not match what was installed. CISA's SBOM page is the requirement. The lab is the missing check. | [CISA on SBOMs](https://www.cisa.gov/topics/information-communications-technology-supply-chain-security/sbom) |
| 20 Version and provenance | The xz backdoor was in the release tarball. It was not in the Git history reviewers were reading. | [Disclosure on oss-security](https://www.openwall.com/lists/oss-security/2024/03/29/4) |
| 21 Axios-style release | `axios@1.14.1` and `axios@0.30.4` were published from a stolen maintainer account and pulled in `plain-crypto-js`. | [Maintainer issue](https://github.com/axios/axios/issues/10604), [StepSecurity](https://www.stepsecurity.io/blog/axios-compromised-on-npm-malicious-versions-drop-remote-access-trojan) |
| 22 LiteLLM-style PyPI | `litellm` 1.82.7 and 1.82.8 were on PyPI for about 40 minutes. LiteLLM says the publish token came out of a CI job that ran a compromised Trivy action. One of the versions ran from a `.pth` file at startup. | [LiteLLM security update](https://docs.litellm.ai/blog/security-update-march-2026) |
| 23 Trivy action | Aqua's advisory for CVE-2026-33634. A tag on the Trivy GitHub Action moved. | [GitHub Advisory GHSA-69fq-xp46-6x23](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23), [Aqua](https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/) |
| 24 Slopsquatting | Researchers showed code assistants invent package names that were never published, then measured how often those names can be claimed. | [Spracklen et al., arXiv:2406.10279](https://arxiv.org/abs/2406.10279) |
| 25 Compromised GitHub Action | `tj-actions/changed-files` tags were moved to a commit that printed secrets into workflow logs. A reviewdog action was compromised in the same window. | [CISA](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction) |

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

**Last Updated**: 2026-10-21

🔐 Stay secure, stay informed!
