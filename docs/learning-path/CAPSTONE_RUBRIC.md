# Capstone Exercise and Scoring Rubric

## Capstone Goal

Evaluate whether learners can investigate, detect, and mitigate a realistic supply chain attack chain using evidence-driven decisions.

## Capstone Scenario

Use a chained flow:

1. Initial dependency-level compromise (for example from beginner/intermediate scenario patterns)
2. Propagation into build/runtime behavior
3. Detection and containment under time pressure
4. Policy hardening and recovery plan

Recommended anchors:

- `scenarios/17-multi-stage-attack-chain/`
- `scenarios/20-package-version-confusion/`
- `scenarios/19-sbom-manipulation-attack/`

## Deliverables (Required)

Learner/team must submit:

1. **Attack Timeline**
   - Sequence of compromise events with timestamps.
2. **Evidence Pack**
   - At least 3 concrete artifacts (logs, JSON outputs, detector results).
3. **Detection Decision Record**
   - Signals used, confidence level, and false-positive considerations.
4. **Mitigation Plan**
   - Immediate containment + long-term controls + CI policy updates.
5. **Post-Incident Playbook**
   - Recovery, communication, and prevention actions.

## Scoring Dimensions (100 points)

### 1) Attack Understanding (20 points)

- 0-5: incomplete or incorrect chain understanding
- 6-12: basic chain explained, key gaps remain
- 13-17: mostly correct with good causal links
- 18-20: precise chain with clear trust-edge analysis

### 2) Detection Quality (25 points)

- 0-8: weak signals, low evidence quality
- 9-15: some useful indicators, limited correlation
- 16-21: strong multi-signal correlation, reproducible
- 22-25: high-confidence detection with low-noise rationale

### 3) Mitigation Quality (25 points)

- 0-8: generic controls, hard to enforce
- 9-15: partial controls, limited operational detail
- 16-21: practical controls across dev/CI/runtime
- 22-25: layered controls with clear implementation path and ownership

### 4) Policy and Governance Readiness (15 points)

- 0-5: no clear policy translation
- 6-10: policy intent present, enforcement unclear
- 11-13: actionable policy with CI checks
- 14-15: complete policy set with measurable pass/fail gates

### 5) Incident Communication (15 points)

- 0-5: unclear report, weak prioritization
- 6-10: understandable but incomplete escalation guidance
- 11-13: clear incident brief and response ownership
- 14-15: executive + engineering communication quality, with next actions

## Pass Thresholds

- **Pass**: 70+
- **Strong Pass**: 85+
- **Hero Level**: 92+ with no zero-scored dimension

## Time-Boxed Capstone Runbook (Suggested)

- 0-15 min: initial triage and scope
- 15-45 min: evidence collection and hypothesis validation
- 45-70 min: containment and mitigation design
- 70-90 min: report-out and policy proposal

## Evaluator Checklist

- Uses simulator safely and correctly (`TESTBENCH_MODE=enabled`)
- Distinguishes symptom vs root cause
- Uses both static and behavioral indicators
- Recommends enforceable controls, not only advisories
- Produces actionable follow-up plan for production rollout
