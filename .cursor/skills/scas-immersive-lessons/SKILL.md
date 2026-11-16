---
name: scas-immersive-lessons
description: >-
  Author and maintain SCAS Command Center lesson.yaml files, campaign YAML,
  classroom tabletop hooks, PR triage, decisions, quizzes, drills, purple
  reversal, diff workbench, and rule CTF fixtures. Use when editing
  scenarios/*/lesson.yaml, campaigns/*.yaml, classroom/CTF flows, or when the
  user mentions immersive learning, decisions, PR triage, or tabletop.
---

# SCAS Immersive Lessons

Command Center (`:3100`) teaches the same 25 labs as the CLI. `lesson.yaml` is
teaching metadata only. Commands stay in `apps/control-plane/src/registry/scenarios.ts`.
README.md stays the CLI command path.

Safety does not change: `TESTBENCH_MODE === 'enabled'`, exfil `127.0.0.1` /
localhost only. Decisions and triage may change path and score. They do not open
the network.

## Where things live

| Piece | Path |
|-------|------|
| Per-lab lesson | `scenarios/NN-slug/lesson.yaml` |
| Lesson schema | `apps/control-plane/src/registry/lesson-types.ts` |
| Parser | `apps/control-plane/src/registry/parse-lesson-yaml.ts` |
| Scenario registry | `apps/control-plane/src/registry/scenarios.ts` |
| Progress | `apps/control-plane/src/learning/progress.ts` → `~/.scas/progress.json` |
| Campaigns | `campaigns/*.yaml` + `apps/control-plane/src/registry/campaigns.ts` |
| Classroom / inject clock | `apps/control-plane/src/learning/learning-platform.ts` |
| Rule CTF | `apps/control-plane/src/ctf/` + `scenarios/<slug>/ctf-fixtures.json` |
| Maintainer docs | `documentation/platform/DASHBOARD.md` |
| Learner docs | `documentation/getting-started/COMMAND_CENTER.md` |
| Tabletop script | `documentation/guides/tabletop-quiet-carrier.md` |

Control plane code after the immersive merge sits under
`apps/control-plane/src/{labs,learning,ctf,registry,routes}/`.

## Required lesson shape

Every lab ships `lesson.yaml`. Copy structure from `scenarios/01-typosquatting/lesson.yaml`.

Minimum fields CI expects:

- `id` (two-digit string matching the folder)
- `etaMinutes`, `category`, `incidents`, `objectives`
- `caseStudy`, `mitigation` (short bullets; not a second DETECT.md)
- `steps[]` with `id`, `registry`, `audience`, `title`, `teaching`, `verify`

`registry` is `setup`, `services`, a `ScenarioStep.id` from the TypeScript
registry, or `null` for teaching-only detect/harden steps.

Verify types: `exit-zero` | `service-listening` | `capture-count` (`min`).

## Optional immersive blocks

| Block | Seed lab | Contract |
|-------|----------|----------|
| `drill` | 01 | Blind artifact review before labels. `artifactType`: diff \| package-page \| ci-log |
| `quiz` | 01 | 2-3 DETECT-derived MCQs after the storyboard |
| `reversal` | 01 | `{ blockedPackage }`; optional `variant: { entry, port }` for polymorphic round 2 via `dependency-guard.js` |
| `decisions` | 01, 05 | After a verified step. Choices carry `effects`: `goto`, `score`, `flag`, `feedback`. Optional `roles`: IC \| Eng \| Comms \| Legal |
| `prTriage` | 01 (all labs have a list) | `afterStep` + 8-10 `prs` with `safe: true\|false`. No real GitHub API |
| `diffWorkbench` | 03 | `fixtureDir` with `git/` and `tarball/` `*.fixture` trees |
| `attck` / `nist` / `prereqs` / `remediates` | 01, 05 | Skills (`/skills`) + Briefing (`/report`) taxonomy |
| `prTriageStep` | 01 | Opt-in flag to surface the inbox mid-lab |

Schema types live in `lesson-types.ts`. Prefer editing YAML against an existing
seed over inventing new keys.

## Campaigns

Files under `campaigns/`. Current ship set:

- `operation-quiet-carrier` - 01 → 05 → 25 → 11 (injects + remediation seed)
- `operation-cold-key` - 06 → 14 → 17 → 21

Required: `id`, `title`, `persona`, `tagline`, `description`, `debrief`,
`chapters[{ scenario, beat, narrative }]`.

Optional (Quiet Carrier pattern):

- `injects` - `when: chapter:NN`, `kind`, `from`, `subject`, `body`, optional `evidence`, `confidence`, `tMinute`
- `remediation` - graded checklist with `weight` + `flag`

Campaigns only order labs and add narrative. They do not change how a lab runs.

## Classroom, tabletop, CTF

- Classroom seats: IC / Eng / Comms / Legal. Role-filtered `decisions` hide foreign calls.
- Shared inject clock reuses campaign `injects`. Facilitator script:
  `documentation/guides/tabletop-quiet-carrier.md`.
- Rule CTF: fixtures in `scenarios/<slug>/ctf-fixtures.json` (lab 01 seed). Scoring
  is offline Sigma/Semgrep in `apps/control-plane/src/ctf/`.

## New lab checklist (immersive slice)

1. Add `scenarios/NN-slug/lesson.yaml` (start from 01; strip blocks you are not seeding yet, keep `caseStudy` + `mitigation` + `prTriage`).
2. Register the lab in `apps/control-plane/src/registry/scenarios.ts`.
3. If branching is needed, add `decisions` with real `afterStep` / `goto` ids that exist in `steps`.
4. Optional: campaign chapter, `ctf-fixtures.json`, `diffWorkbench` fixtures.
5. Validate:

```bash
node scripts/docs/check-lesson-yaml.js
node scripts/docs/check-info-consistency.js
node scripts/docs/check-markdown-watermarks.js
```

6. Still ship Archify + DETECT/README via the other SCAS skills.

## Do not

- Put shell commands in `lesson.yaml` that belong in the TypeScript registry
- Call real GitHub, npm, or remote C2 from triage / CTF / diff fixtures
- Weaken TESTBENCH or localhost exfil for a "cooler" decision path
- Edit `docs/` GitHub Pages mirrors for lesson prose - edit `documentation/` or the scenario folder

## Related

- Scenario docs / mitigations: `.cursor/skills/scas-scenario-docs/SKILL.md`
- Archify pack: `.cursor/skills/scas-archify-scenario-pack/SKILL.md`
- Scenario code rule: `.cursor/rules/scas-scenarios.mdc`
- Core safety + dual drivers: `.cursor/rules/scas-core.mdc`
