# Module Instance: Scenario 24 - Slopsquatting

## Learning Objectives

- Identify slopsquatting: when an attacker publishes a package under a name an LLM hallucinated.
- Observe how generated code suggestions can lead to malicious dependency installs.
- Practice mitigation through dependency pinning, namespace verification, and human review.

## Scenario Integration

This module maps to scenario `24-slopsquatting`. Students complete the [zero-to-hero guide](../scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_24.md) and the quick reference, then answer the workbook questions below.

## Workbook

1. What package name did the LLM suggest, and how did the attacker claim it?
2. Which file inside the victim app imports the malicious package?
3. What data is exfiltrated to `127.0.0.1:3024`?
4. List three controls that would prevent this attack in a real CI pipeline.

## Instructor Notes

- Emphasize that slopsquatting relies on social/LLM trust, not registry typos.
- Remind students that the mock exfil server only runs on `127.0.0.1:3024`.
