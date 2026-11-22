# SCAS diagrams (Excalidraw)

**Machine-readable contract:** [`scripts/lib/diagram-specs.js`](../../../scripts/lib/diagram-specs.js)  
**CI harness:** `node scripts/diagrams/check-diagram-assets.js`

Markdown cannot render raw `.excalidraw`. Assets are organized by **category**, then by **format**:

```
documentation/assets/diagrams/
  platform/{svg,excalidraw}/          # hand-authored curriculum / architecture
  observability/{svg,excalidraw}/     # scas-observability-scenario-NN (+ legacy flow)
  codeflow/{svg,excalidraw}/          # scas-codeflow-scenario-NN
  README.md
```

Embed SVG only, e.g. `![...](../assets/diagrams/platform/svg/scas-e2e-lab-flow.svg)`.

## Platform (hand-authored)

| Basename | Doc(s) |
|----------|--------|
| `scas-e2e-lab-flow` | [ARCHITECTURE.md](../../platform/ARCHITECTURE.md) |
| `scas-session-tracks` | [OPERATIONS.md](../../platform/OPERATIONS.md) |
| `scas-threat-boundaries` | [ARCHITECTURE.md](../../platform/ARCHITECTURE.md) |
| `scas-curriculum-stages` | [SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md](../../learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md) |
| `scas-scenario-17-stage-chain` | [ZERO_TO_HERO_SCENARIO_17.md](../../scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_17.md) |

## Observability (23 unique zero-to-hero guides)

- `scas-observability-scenario-01` ... `23`
- Generator: [`scripts/diagrams/generate-scenario-observability-diagrams.js`](../../../scripts/diagrams/generate-scenario-observability-diagrams.js)
- Section injector: [`detection-tools/es/generate-observability-section.js`](../../../detection-tools/es/generate-observability-section.js). End-to-end flow frames the Archify architecture page, and Sequence diagram (Phase 1-5) frames the Archify sequence page. The SVG pair stays on disk for this harness.

## Codeflow (23 unique zero-to-hero guides)

- `scas-codeflow-scenario-01` ... `23`
- Generator: [`scripts/diagrams/generate-scenario-codeflow-diagrams.js`](../../../scripts/diagrams/generate-scenario-codeflow-diagrams.js) - **SVG only** under `## Code-level workflow`

```bash
node scripts/diagrams/generate-scenario-observability-diagrams.js
node scripts/diagrams/generate-scenario-codeflow-diagrams.js
node detection-tools/es/generate-observability-section.js
node scripts/diagrams/check-diagram-assets.js
```

**CI:** [`.github/workflows/diagrams.yml`](../../../.github/workflows/diagrams.yml) regenerates observability assets and fails on drift; smoke runs the harness on every PR.
