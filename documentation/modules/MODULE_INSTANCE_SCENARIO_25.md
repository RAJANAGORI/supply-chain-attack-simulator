# Module Instance: Scenario 25 - Compromised Reusable GitHub Action

## Learning Objectives

- Understand the blast radius of a force-pushed mutable action tag.
- Observe how a reusable action can exfiltrate CI secrets before running legitimate steps.
- Practice mitigation through SHA pinning, least-privilege permissions, and workflow review.

## Scenario Integration

This module maps to scenario `25-compromised-github-action`. Students complete the [zero-to-hero guide](../scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_25.md) and the quick reference, then answer the workbook questions below.

## Workbook

1. How did the attacker publish a malicious version of the reusable action?
2. Which secret values does the action read from the workflow environment?
3. What is the exfiltration target, and why is it constrained to `127.0.0.1`?
4. Write a GitHub Actions gate that rejects mutable tags in workflow files.

## Instructor Notes

- Compare this scenario to scenario 05 to show force-push vs. injection variants.
- Remind students that the mock exfil server only runs on `127.0.0.1:3025`.
