# Security Policy

## Scope and intent

This repository intentionally contains vulnerable patterns and simulated malicious behavior for education in isolated environments.

Please report:

- Real vulnerabilities in repository infrastructure, scripts, workflows, or tooling.
- Safety bypasses that could enable non-local or uncontrolled behavior.
- CI/CD or dependency risks introduced by repository code.

Please do not report:

- The intentionally vulnerable scenario mechanics themselves, unless they bypass documented safety constraints.

## Safety model expectations

All scenario attack logic should remain:

- Gated by explicit testbench controls (for example `TESTBENCH_MODE=enabled`)
- Localhost-only for simulated exfiltration endpoints
- Clearly labeled as educational behavior

## How to report

For security-sensitive disclosures, use GitHub private vulnerability reporting:

- [GitHub Advisories](https://github.com/RAJANAGORI/supply-chain-attack-simulator/security/advisories/new)

If private advisories are not available in your context, open a minimal public issue without exploit details and request a secure contact path.

## Response goals

- Initial triage acknowledgment: within 5 business days
- Follow-up and severity assessment: as soon as practical
- Coordinated fix and disclosure timeline based on impact and exploitability

Thanks for helping keep this project safe for learners and educators.
