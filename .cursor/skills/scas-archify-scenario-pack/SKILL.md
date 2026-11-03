---
name: scas-archify-scenario-pack
description: >-
  Build the SCAS Archify pack for a supply-chain lab: architecture HTML, sequence
  HTML, and archify_SNN.md under .archify/scenarios/NN-slug/. Use when creating a
  new scenarios/NN-slug/ lab, finishing a new scenario, regenerating Archify
  diagrams for a scenario, or when the user mentions Archify pack, scenario
  architecture brief, or .archify/scenarios.
---

# SCAS Archify Scenario Pack

When a new lab lands under `scenarios/NN-slug/` (or an existing pack is missing /
stale), ship the same three artifacts every current lab has. Do not skip this
after scenario code and docs are done.

## Required deliverables

```text
.archify/scenarios/NN-slug/
  architecture/
    candidate.json
    scNN-slug-architecture.html
  sequence/
    candidate.json
    scNN-slug-sequence.html
  archify_SNN.md
```

Then update [`.archify/INDEX.md`](../../../.archify/INDEX.md) with one row for the lab.

`NN` is always zero-padded (`01`...`99`). `slug` matches `scenarios/NN-slug/` after the numeric prefix. Brief name is `archify_SNN.md` (zero-padded), never `archify_S1.md`.

## Quality bar (copy from 06 / 01)

Reference packs:

- `.archify/scenarios/06-sha-hulud/` (richest topology)
- `.archify/scenarios/01-typosquatting/` (typical single-mock lab)

Architecture must include:

- Control Center (`:3100`), `setup.sh`, victim/corporate app (or scenario-specific runner), payload node, mock listener(s) with real ports, capture store(s), optional Floci when registry lists it
- Region `127.0.0.1 lab only` + security-group `TESTBENCH_MODE=enabled` wrapping the payload when the gate exists
- Repo-backed `sources` on components (`scenarios/NN-slug/...` and `apps/control-plane/src/registry/scenarios.ts`)
- `meta.subtitle`, 2-3 `meta.views`, three teaching cards
- Showcase finalize with the project Archify CLI

Sequence must encode the install/run attack path (forward-path, about 8-10 messages). Prefer y >= 160, spacing that passes layout checks, viewBox width that passes showcase desktop readability.

Brief must mirror `archify_S01.md` / `archify_S06.md` sections: diagram links, one-line verdict, cast / system map, chains, evidence endpoints, source anchors, blue-team talk track, re-render commands. ASCII hyphen-minus and straight quotes only. Run `python3 ~/.cursor/hooks/prose_guard.py scan` on the brief and on `INDEX.md` edits.

## Tooling

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs   # prefer project skill; keep Archify current
ROOT=.                                           # repo root
REV=$(git rev-parse HEAD)
```

Pin `meta.repository` to:

- `url`: `https://github.com/RAJANAGORI/supply-chain-attack-simulator.git`
- `revision`: current 40-char `HEAD`
- `provider`: `github`

`meta.output` paths are repo-relative:

```text
.archify/scenarios/NN-slug/architecture/scNN-slug-architecture.html
.archify/scenarios/NN-slug/sequence/scNN-slug-sequence.html
```

## Workflow

1. **Evidence.** Read `apps/control-plane/src/registry/scenarios.ts` for this id (ports, services, steps, captures, floci, lesson). Read `setup.sh`, `README.md`, `DETECT.md`, `infrastructure/*`, victim/corporate app, malicious package/payload.
2. **Author architecture** candidate under `.archify/scenarios/NN-slug/architecture/candidate.json`.
3. **Author sequence** candidate under `.archify/scenarios/NN-slug/sequence/candidate.json`. Sequence stem must match the scenario slug (`scNN-slug-sequence`), not a cute alternate slug.
4. **Finalize both** at showcase quality:

```bash
node "$ARCHIFY" finalize architecture \
  .archify/scenarios/NN-slug/architecture/candidate.json \
  .archify/scenarios/NN-slug/architecture/scNN-slug-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/NN-slug/sequence/candidate.json \
  .archify/scenarios/NN-slug/sequence/scNN-slug-sequence.html \
  --repo-root . --quality showcase --json
```

On failure: repair layout (shorten labels, move nodes, drop return noise), then re-run with `--out-dir .archify/scenarios/NN-slug/architecture/review-N` (or `sequence/review-N`) once browser evidence already exists for that HTML path.

5. **Write** `.archify/scenarios/NN-slug/archify_SNN.md` with relative diagram links:

```markdown
| Lab topology | [`architecture/scNN-slug-architecture.html`](architecture/scNN-slug-architecture.html) | ... |
| Attack sequence | [`sequence/scNN-slug-sequence.html`](sequence/scNN-slug-sequence.html) | ... |
```

6. **Index.** Add or refresh the row in `.archify/INDEX.md`.
7. **Do not** leave flat packs at `.archify/architecture-scNN-*` or root-level `archify_SNN.md`. Do not revive deleted Oct-3 timestamp folders.

## Safety (never weaken)

Same as SCAS core:

- Malicious paths gated by `TESTBENCH_MODE === 'enabled'`
- Exfil / publish / PR mocks target `127.0.0.1` / `localhost` only
- Diagrams must show those gates, not invent real-internet C2

## Exceptions to wire carefully

| Pattern | Examples | Diagram notes |
|---|---|---|
| Extra attacker registry | 02, 11 | Second listener (often `:4874`) + misconfigured `.npmrc` |
| Multi-mock worm | 06 | Harvester + GitHub sim + mock registry; three capture files |
| Container / non-npm start | 14 | Runner path, not a plain `victim-app` npm start |
| Python mock | 22 | `mock_server.py` as the collector |
| No normal victim-app | 23 | Shape around CI/scanner + C2 from the real tree |
| Actions / act | 05, 25 | Include workflow / act binding in the story |

## Done checklist

- [ ] `architecture/` showcase finalize passed (validate, deliver, check, browser-check)
- [ ] `sequence/` showcase finalize passed
- [ ] `archify_SNN.md` present, prose_guard OK, relative links resolve
- [ ] `INDEX.md` row present
- [ ] Folder names and HTML stems use `NN-slug` consistently
- [ ] Control Center registry entry for the lab already exists (or is added in the same change)

## Related skills / rules

- Archify product skill: `.agents/skills/archify/SKILL.md` (finalize, schemas, layout repair)
- Scenario docs: `.cursor/skills/scas-scenario-docs/SKILL.md` (README / DETECT mitigation)
- Scenario code rule: `.cursor/rules/scas-scenarios.mdc`
- Docs Excalidraw/SVG diagrams stay under `documentation/assets/diagrams/` (separate from this Archify pack)
