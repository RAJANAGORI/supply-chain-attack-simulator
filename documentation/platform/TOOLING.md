# Tooling & doc maintenance

Every maintainer-facing script in [`scripts/`](../../scripts/), grouped by purpose, plus the documentation build and content-sync lifecycle. This is the **canonical reference** for repository tooling - other docs link here instead of repeating command lists.

> **Audience:** contributors and maintainers. Learners running labs only need [Operations](./OPERATIONS.md) and the [scenario catalog](../scenario-guides/CATALOG.md).

---

## Script catalog

### Setup & teardown

| Script | Purpose |
|--------|---------|
| [`START_HERE.sh`](../../START_HERE.sh) | **Front door** - `exec ./install.sh`. Bare run: labs / workshop / docker menu |
| [`install.sh`](../../install.sh) | Same installer. `-y` is workshop stack (prereqs, npm, ES/Kibana, Floci; writes `.scas.env`) |
| [`install-external.sh`](../../install-external.sh) | **Optional** external-disk wrapper - storage on USB HDD/SSD, then calls `install.sh` |
| [`scripts/setup/setup-external-storage.sh`](../../scripts/setup/setup-external-storage.sh) | Low-level: Docker `data-root` + repo/npm cache onto an external disk (no stack install) |
| [`scripts/setup/setup.sh`](../../scripts/setup/setup.sh) | Repo-wide setup; creates `.testbench.env`. Skips y/N when `CI=1`, `SCAS_YES=1`, or no TTY |
| [`scripts/setup/teardown.sh`](../../scripts/setup/teardown.sh) | Kill scenario ports, remove captures & `node_modules` |
| [`scripts/setup/ensure-act.sh`](../../scripts/setup/ensure-act.sh) | Install nektos/act into `.tools/bin` (labs 05/25) |
| [`scripts/setup/kill-port.sh`](../../scripts/setup/kill-port.sh) | Free one port, or `--all` ports from `ports.env` |
| [`scripts/smoke/smoke-all-scenarios.sh`](../../scripts/smoke/smoke-all-scenarios.sh) | End-to-end smoke test across all 25 scenarios |
| [`scripts/docs/check-info-consistency.js`](../../scripts/docs/check-info-consistency.js) | **CI harness** - fail if public lab counts / indexes / ranges drift from on-disk `scenarios/NN-*` |
| [`scripts/docs/check-markdown-watermarks.js`](../../scripts/docs/check-markdown-watermarks.js) | **CI harness** - fail if tracked `.md`/`.mdc` contain em/en dash, curly quotes, or zero-width marks |
| [`scripts/docs/check-es-forward-hooks.js`](../../scripts/docs/check-es-forward-hooks.js) | **CI harness** - fail if `setup.sh` rewrites a mock collector without ES forward, or tracked collectors lack the hook |
| [`scripts/diagrams/check-diagram-assets.js`](../../scripts/diagrams/check-diagram-assets.js) | **CI harness** - Excalidraw/SVG drawing contract (`scripts/lib/diagram-specs.js`); also in [Smoke](../../.github/workflows/smoke.yml) + path-filtered [Diagrams](../../.github/workflows/diagrams.yml) |
| [`scripts/lib/diagram-specs.js`](../../scripts/lib/diagram-specs.js) | Canonical nodes/edges/labels for diagrams - edit before redrawing |
| [`scripts/diagrams/generate-scenario-observability-diagrams.js`](../../scripts/diagrams/generate-scenario-observability-diagrams.js) | Generate unique `scas-observability-scenario-NN.{excalidraw,svg}` for all 25 labs (CI regenerates and fails on drift) |
| [`scripts/diagrams/generate-scenario-codeflow-diagrams.js`](../../scripts/diagrams/generate-scenario-codeflow-diagrams.js) | Generate dense `scas-codeflow-scenario-NN.{excalidraw,svg}` for all 25 labs (Panel A-E code-level workflow) |
| [`scripts/setup/ports.env`](../../scripts/setup/ports.env) | Source-of-truth port allow-list (see [Operations → port matrix](./OPERATIONS.md#port-matrix)) |
| [`scenarios/_shared/run-act.sh`](../../scenarios/_shared/run-act.sh) | Optional [nektos/act](https://github.com/nektos/act) runner for GHA labs (05, 25). Maps remote `uses:` refs to local folders, host runner, Node fallback |

### Dashboard / workshop UI

| Script | Purpose |
|--------|---------|
| [`run.sh`](../../run.sh) | Thin alias → `scripts/ui/run-everything.sh` (ES + Floci + act + dashboard) |
| [`scripts/ui/run-everything.sh`](../../scripts/ui/run-everything.sh) | Full stack; writes `.scas.env`; flags `--core-only`, `--skip-es`, `--skip-floci`, `--skip-act`, `--no-ui`, `--skip-setup` |
| [`scripts/ui/start-dashboard.sh`](../../scripts/ui/start-dashboard.sh) | Control plane + Next dashboard (marketing: https://simulator.rajanagori.in/) |
| [`scripts/ui/conference-demo-up.sh`](../../scripts/ui/conference-demo-up.sh) | Remote lab host smoke: prereqs, stack, health, lab 01 verify |

Learner-facing write-up: [DASHBOARD.md](./DASHBOARD.md).

### Observability (Elasticsearch + Kibana)

| Script | Purpose |
|--------|---------|
| [`scripts/observability/elasticsearch-up.sh`](../../scripts/observability/elasticsearch-up.sh) | Start ES + Kibana, seed runbooks/Kibana views, backfill `ship-captures.js` |
| [`scripts/observability/elasticsearch-down.sh`](../../scripts/observability/elasticsearch-down.sh) | Stop the observability stack |
| [`scripts/observability/setup-kibana-data-views.sh`](../../scripts/observability/setup-kibana-data-views.sh) | Create Kibana data views + saved searches |
| [`scripts/observability/smoke-observability.sh`](../../scripts/observability/smoke-observability.sh) | Validate ES indices and shippers |

Full workflow: [Detection & observability](./DETECTION_AND_OBSERVABILITY.md) · [Observability stack](../../observability/README.md).

### Floci cloud track (optional)

Local-AWS emulator track for all 25 scenarios (S3 universal; extended on 05, 06, 11, 14, 17, 19, 23). Full guide: [Floci integration](../guides/FLOCI_INTEGRATION.md).

| Script | Purpose |
|--------|---------|
| [`scripts/floci/floci-setup.sh`](../../scripts/floci/floci-setup.sh) | Clone + build vendor, or `--image` for the published container |
| [`scripts/floci/floci-up.sh`](../../scripts/floci/floci-up.sh) | Start emulator and wait for health |
| [`scripts/floci/floci-down.sh`](../../scripts/floci/floci-down.sh) | Stop emulator |
| [`scripts/floci/floci-status.sh`](../../scripts/floci/floci-status.sh) | Health + container status |
| [`scripts/floci/floci-bridge.sh`](../../scripts/floci/floci-bridge.sh) | Shared S3/ECR/Secrets helpers, sourced by scenario seed/verify scripts |
| [`scripts/floci/floci-upload-json.sh`](../../scripts/floci/floci-upload-json.sh) | Pipe JSON → `s3://scas-scNN-artifacts/` |

### Documentation maintenance

Keeps scenario docs, table-of-contents blocks, and mitigation playbooks consistent. See [the lifecycle below](#documentation-content-lifecycle).

| Script | Purpose |
|--------|---------|
| [`scripts/docs/inject-markdown-toc.js`](../../scripts/docs/inject-markdown-toc.js) | Regenerate the **Table of Contents** in zero-to-hero guides, scenario READMEs, and quick-reference cards. Targets: `all`, `readme`, `quick-ref`, `zero-to-hero` |
| [`scripts/docs/sync-mitigation-gaps.js`](../../scripts/docs/sync-mitigation-gaps.js) | Sync `## Mitigation` (DETECT.md) and README playbooks for scenarios 01-06 from canonical data |
| [`scripts/docs/inject-zero-to-hero-mitigation-playbooks.js`](../../scripts/docs/inject-zero-to-hero-mitigation-playbooks.js) | Insert `## Mitigation Playbook` into a zero-to-hero guide (idempotent) |
| [`scripts/docs/inject-zero-to-hero-toc.js`](../../scripts/docs/inject-zero-to-hero-toc.js) | Deprecated wrapper → `inject-markdown-toc.js zero-to-hero` |
| [`scripts/docs/restore-docs-symlinks.sh`](../../scripts/docs/restore-docs-symlinks.sh) | Restore `docs/` → `documentation/` symlinks after accidental local materialize |
| [`scripts/lib/markdown-toc.js`](../../scripts/lib/markdown-toc.js) | Shared TOC/slug helpers (consumed by the inject scripts) |
| [`scripts/lib/mitigation-playbooks.js`](../../scripts/lib/mitigation-playbooks.js) | **Canonical mitigation bullets** per scenario - edit here first |
| [`scripts/docs/materialize-docs-for-pages.sh`](../../scripts/docs/materialize-docs-for-pages.sh) | Copy Markdown into `docs/_sources/` for GitHub Pages (guide.html fetch; no bare `.md` URLs) |

### Content & publishing

| Script | Purpose |
|--------|---------|
| [`scripts/docs/generate-substack-posts.js`](../../scripts/docs/generate-substack-posts.js) | Generate per-scenario long-form posts into `subsstack/` from observability metadata (shared Excalidraw SVG + attack-steps table; no Mermaid) |
| [`scripts/docs/substack-scenario-copy.js`](../../scripts/docs/substack-scenario-copy.js) | Editorial copy data consumed by the generator |

### Provenance & integrity

| Script | Purpose |
|--------|---------|
| [`scripts/provenance/embed-scenario-provenance.sh`](../../scripts/provenance/embed-scenario-provenance.sh) | Embed SCAS authorship fingerprints across scenario trees (idempotent) |
| [`scripts/provenance/verify-provenance.sh`](../../scripts/provenance/verify-provenance.sh) | Verify fingerprints in a checkout (yours or a suspect copy) |

### Project management

| Script | Purpose |
|--------|---------|
| [`scripts/setup/setup-github-project-board.sh`](../../scripts/setup/setup-github-project-board.sh) | Create/populate the "2026 Roadmap" GitHub Project board (needs `gh` with project scopes) |

---

## Documentation content lifecycle

Canonical mitigation content lives in [`scripts/lib/mitigation-playbooks.js`](../../scripts/lib/mitigation-playbooks.js). When you change scenario mitigations, headings, or add a scenario, regenerate derived sections so the README, `DETECT.md`, walkthroughs, and TOCs stay aligned:

```bash
# 1. Edit canonical bullets (if mitigations changed)
#    scripts/lib/mitigation-playbooks.js

# 2. Sync DETECT.md mitigation + README playbooks (scenarios 01-06)
node scripts/docs/sync-mitigation-gaps.js

# 3. Insert the Mitigation Playbook into any new zero-to-hero guide
node scripts/docs/inject-zero-to-hero-mitigation-playbooks.js

# 4. Rebuild every Table of Contents
node scripts/docs/inject-markdown-toc.js all

# 5. After adding/removing a scenario (or changing public counts), update all of:
#    - scenarios/NN-slug/{README,DETECT,setup,lesson.yaml,FLOCI} (lesson.yaml needs caseStudy + mitigation)
#    - README, AUTHORS, docs/index.html (hero counts AND scenario cards 01..NN), docs/guide.html
#    - docs/docs-manifest.json, CATALOG, zero-to-hero / quick-ref / modules indexes
#    - ZERO_TO_HERO_SCENARIO_NN.md with non-empty Mitigation Playbook + Straightforward Implementation
#    - observability "N runbooks" / "2N saved searches", playbooks, control-plane registry, diagram specs
#    Then verify (CI runs this in smoke.yml):
node scripts/docs/check-info-consistency.js
#    The harness also fails on: missing landing cards, empty Z2H mitigation sections,
#    missing lesson.yaml caseStudy/mitigation, FLOCI.md gaps, and stale "all N scenarios" / 02-NN ranges.

# 5b. Markdown punctuation (ASCII hyphen/quotes only; smoke.yml)
node scripts/docs/check-markdown-watermarks.js

# 6. After editing diagrams under documentation/assets/diagrams/:
#    update scripts/lib/diagram-specs.js if nodes/edges changed, keep .excalidraw+.svg
#    pairs, escape & in SVG text, no Mermaid in contracted docs.
#    For observability, regenerate unique per-scenario assets first:
node scripts/diagrams/generate-scenario-observability-diagrams.js
node scripts/diagrams/generate-scenario-codeflow-diagrams.js
node scripts/diagrams/check-diagram-assets.js
```

**Diagrams:** specs in [`scripts/lib/diagram-specs.js`](../../scripts/lib/diagram-specs.js); assets in [`documentation/assets/diagrams/`](../assets/diagrams/README.md) under `platform/`, `observability/`, and `codeflow/` (each with `svg/` + `excalidraw/`). Markdown embeds SVG only. Zero-to-hero uses unique `scas-observability-scenario-NN` and `scas-codeflow-scenario-NN` diagrams for all 25 labs.

**What goes where:**

- Scenario `README.md` → `## Mitigation Playbook` + Table of Contents
- Scenario `DETECT.md` → detection content + short `## Mitigation` for responders
- `documentation/scenario-guides/zero-to-hero/*` → `## Mitigation Playbook` + Table of Contents

If you change DETECT.md structure or observability flow, also re-run the ES helpers:

```bash
node detection-tools/es/generate-observability-section.js   # embeds unique scas-observability-scenario-NN.svg + Phase-2 table (no Mermaid)
node detection-tools/es/load-runbooks.js                    # reload DETECT.md into scas-rules
```

---

## Documentation build & publishing

The site under [`docs/`](../../docs/) is GitHub Pages. Content folders are **symlinks** into `documentation/`, and [`docs-manifest.json`](../../docs/docs-manifest.json) drives the [`guide.html`](../../docs/guide.html) reader's sidebar.

```bash
# Replace docs/ symlinks with real files under docs/_sources/ for guide.html fetch.
./scripts/docs/materialize-docs-for-pages.sh
```

When adding or moving a documentation file, update in lockstep:

1. The relevant section `index.md` (and [`documentation/index.md`](../index.md) map if a new section).
2. [`docs/docs-manifest.json`](../../docs/docs-manifest.json) - add the page to the right group.
3. Regenerate the sitemap: `node scripts/docs/generate-sitemap.js` → [`docs/sitemap.xml`](../../docs/sitemap.xml).
4. [`scripts/docs/materialize-docs-for-pages.sh`](../../scripts/docs/materialize-docs-for-pages.sh) - add the folder if it's a new top-level section.

Per-page SEO in the docs reader (`guide.html`) is updated at runtime by [`docs/assets/js/docs-app.js`](../../docs/assets/js/docs-app.js) (title, description, canonical, Open Graph, Twitter). Landing-page SEO lives in [`docs/index.html`](../../docs/index.html).

---

## Related

- [Operations](./OPERATIONS.md) - day-two lab workflow, ports, troubleshooting
- [Detection & observability](./DETECTION_AND_OBSERVABILITY.md) - blue-team + Elasticsearch
- [CONTRIBUTING](../../CONTRIBUTING.md) - contribution workflow and DCO
- [↑ Documentation index](../index.md)
