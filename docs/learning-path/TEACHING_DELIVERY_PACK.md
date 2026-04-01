# Teaching Delivery Pack

Think of this as your instructor playbook.  
You can teach the same core material as a live session, written guide, course, or hands-on lab without rewriting everything from scratch.

## Shared Core (Use Everywhere)

- Landing page: [SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md](./SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md)
- Scenario map: [SCENARIO_LEARNING_PATH.md](./SCENARIO_LEARNING_PATH.md)
- Module template: [MODULE_TEMPLATE.md](../modules/MODULE_TEMPLATE.md)
- Example module instances:
  - [MODULE_INSTANCE_SCENARIO_01.md](../modules/MODULE_INSTANCE_SCENARIO_01.md)
  - [MODULE_INSTANCE_SCENARIO_20.md](../modules/MODULE_INSTANCE_SCENARIO_20.md)

## 1) Live Talk / Workshop Variant

### 60-90 Minute Agenda

1. Foundations and trust edges (10 min)
2. Beginner demo (Scenario 01) (20 min)
3. Advanced demo (Scenario 20) (20 min)
4. Defense-in-depth checklist (15 min)
5. Q&A and action plan (10-25 min)

### Speaker Checklist

- Confirm `TESTBENCH_MODE=enabled` before all demos.
- Keep one terminal for victim flow and one for evidence.
- Show at least one detection output and one mitigation policy per demo.
- End with a "what to deploy Monday" controls list.

## 2) Written Documentation Variant

### Page Structure

1. What is the attack class?
2. Why it matters in production.
3. Reproduce in simulator.
4. Detect with evidence.
5. Prevent with policy.
6. Debrief and next scenario.

### Writing Rules

- Short sections with one concept each.
- Commands immediately followed by expected outcome.
- Use links to scenario README for full lab details.

## 3) Multi-Session Course Variant

### Module Split

- **Session A (Beginner)**: scenarios 01-03
- **Session B (Intermediate)**: scenarios 04, 07, 08, 10, 12, 13, 16
- **Session C (Advanced)**: scenarios 05, 06, 09, 11, 14, 15, 17, 18, 19, 20
- **Session D (Capstone)**: red/blue integrated exercise + rubric scoring

### Grading Signals

- Attack correctness (safe and reproducible)
- Detection quality (signal fidelity and explainability)
- Mitigation quality (policy enforceability and coverage)

## 4) Simulator Walkthrough Variant

### Hands-On Sequence

1. Learner runs setup and reproduces attack.
2. Learner captures evidence and writes incident notes.
3. Learner runs detector and compares expected vs observed.
4. Learner implements mitigation controls.
5. Learner validates no-regression behavior.

### Required Artifacts Per Run

- Evidence output (logs, JSON, or captured endpoint data)
- Detection summary
- Mitigation checklist
- One production policy recommendation

## Facilitator Operations Checklist

- Run environment and port checks before each session.
- Include teardown steps after every scenario.
- Apply the same scorecard at module close.
- Save learner outputs in a consistent folder naming convention.
