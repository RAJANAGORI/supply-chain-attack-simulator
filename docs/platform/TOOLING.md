# Tooling & doc maintenance

Every maintainer-facing script in [`scripts/`](../../scripts/), grouped by purpose, plus the documentation build and content-sync lifecycle. This is the **canonical reference** for repository tooling — other docs link here instead of repeating command lists.

> **Audience:** contributors and maintainers. Learners running labs only need [Operations](./OPERATIONS.md) and the [scenario catalog](../scenario-guides/CATALOG.md).

---

## Script catalog

### Setup & teardown

| Script | Purpose |
|--------|---------|
| [`scripts/setup.sh`](../../scripts/setup.sh) | Repo-wide setup; creates `.testbench.env` |
| [`scripts/teardown.sh`](../../scripts/teardown.sh) | Kill scenario ports, remove captures & `node_modules` |
| [`scripts/kill-port.sh`](../../scripts/kill-port.sh) | Free one port, or `--all` ports from `ports.env` |
| [`scripts/smoke-all-scenarios.sh`](../../scripts/smoke-all-scenarios.sh) | End-to-end smoke test across all 22 scenarios |
| [`scripts/ports.env`](../../scripts/ports.env) | Source-of-truth port allow-list (see [Operations → port matrix](./OPERATIONS.md#port-matrix)) |

### Observability (Elasticsearch + Kibana)

| Script | Purpose |
|--------|---------|
| [`scripts/elasticsearch-up.sh`](../../scripts/elasticsearch-up.sh) | Start ES + Kibana, seed runbooks |
| [`scripts/elasticsearch-down.sh`](../../scripts/elasticsearch-down.sh) | Stop the observability stack |
| [`scripts/setup-kibana-data-views.sh`](../../scripts/setup-kibana-data-views.sh) | Create Kibana data views + saved searches |
| [`scripts/smoke-observability.sh`](../../scripts/smoke-observability.sh) | Validate ES indices and shippers |

Full workflow: [Detection & observability](./DETECTION_AND_OBSERVABILITY.md) · [Observability stack](../../observability/README.md).

### Floci cloud track (optional)

Local-AWS emulator track for scenarios 05, 06, 14, 17, 21. Full guide: [Floci integration](../guides/FLOCI_INTEGRATION.md).

| Script | Purpose |
|--------|---------|
| [`scripts/floci-setup.sh`](../../scripts/floci-setup.sh) | Clone + build vendor, or `--image` for the published container |
| [`scripts/floci-up.sh`](../../scripts/floci-up.sh) | Start emulator and wait for health |
| [`scripts/floci-down.sh`](../../scripts/floci-down.sh) | Stop emulator |
| [`scripts/floci-status.sh`](../../scripts/floci-status.sh) | Health + container status |
| [`scripts/floci-bridge.sh`](../../scripts/floci-bridge.sh) | Shared S3/ECR/Secrets helpers, sourced by scenario seed/verify scripts |
| [`scripts/floci-upload-json.sh`](../../scripts/floci-upload-json.sh) | Pipe JSON → `s3://scas-scNN-artifacts/` |

### Documentation maintenance

Keeps scenario docs, table-of-contents blocks, and mitigation playbooks consistent. See [the lifecycle below](#documentation-content-lifecycle).

| Script | Purpose |
|--------|---------|
| [`scripts/inject-markdown-toc.js`](../../scripts/inject-markdown-toc.js) | Regenerate the **Table of Contents** in zero-to-hero guides, scenario READMEs, and quick-reference cards. Targets: `all`, `readme`, `quick-ref`, `zero-to-hero` |
| [`scripts/sync-mitigation-gaps.js`](../../scripts/sync-mitigation-gaps.js) | Sync `## Mitigation` (DETECT.md) and README playbooks for scenarios 01–06 from canonical data |
| [`scripts/inject-zero-to-hero-mitigation-playbooks.js`](../../scripts/inject-zero-to-hero-mitigation-playbooks.js) | Insert `## Mitigation Playbook` into a zero-to-hero guide (idempotent) |
| [`scripts/inject-zero-to-hero-toc.js`](../../scripts/inject-zero-to-hero-toc.js) | Zero-to-hero-only TOC pass (subset of `inject-markdown-toc.js`) |
| [`scripts/lib/markdown-toc.js`](../../scripts/lib/markdown-toc.js) | Shared TOC/slug helpers (consumed by the inject scripts) |
| [`scripts/lib/mitigation-playbooks.js`](../../scripts/lib/mitigation-playbooks.js) | **Canonical mitigation bullets** per scenario — edit here first |
| [`scripts/materialize-docs-for-pages.sh`](../../scripts/materialize-docs-for-pages.sh) | Replace `docs/` symlinks with real files for GitHub Pages |

### Content & publishing

| Script | Purpose |
|--------|---------|
| [`scripts/generate-substack-posts.js`](../../scripts/generate-substack-posts.js) | Generate per-scenario long-form posts into `subsstack/` from observability metadata |
| [`scripts/substack-scenario-copy.js`](../../scripts/substack-scenario-copy.js) | Editorial copy data consumed by the generator |

### Provenance & integrity

| Script | Purpose |
|--------|---------|
| [`scripts/embed-scenario-provenance.sh`](../../scripts/embed-scenario-provenance.sh) | Embed SCAS authorship fingerprints across scenario trees (idempotent) |
| [`scripts/verify-provenance.sh`](../../scripts/verify-provenance.sh) | Verify fingerprints in a checkout (yours or a suspect copy) |

### Project management

| Script | Purpose |
|--------|---------|
| [`scripts/setup-github-project-board.sh`](../../scripts/setup-github-project-board.sh) | Create/populate the "2026 Roadmap" GitHub Project board (needs `gh` with project scopes) |

---

## Documentation content lifecycle

Canonical mitigation content lives in [`scripts/lib/mitigation-playbooks.js`](../../scripts/lib/mitigation-playbooks.js). When you change scenario mitigations, headings, or add a scenario, regenerate derived sections so the README, `DETECT.md`, walkthroughs, and TOCs stay aligned:

```bash
# 1. Edit canonical bullets (if mitigations changed)
#    scripts/lib/mitigation-playbooks.js

# 2. Sync DETECT.md mitigation + README playbooks (scenarios 01–06)
node scripts/sync-mitigation-gaps.js

# 3. Insert the Mitigation Playbook into any new zero-to-hero guide
node scripts/inject-zero-to-hero-mitigation-playbooks.js

# 4. Rebuild every Table of Contents
node scripts/inject-markdown-toc.js all
```

**What goes where:**

- Scenario `README.md` → `## Mitigation Playbook` + Table of Contents
- Scenario `DETECT.md` → detection content + short `## Mitigation` for responders
- `documentation/scenario-guides/zero-to-hero/*` → `## Mitigation Playbook` + Table of Contents

If you change DETECT.md structure or observability flow, also re-run the ES helpers:

```bash
node detection-tools/es/generate-observability-section.js   # if diagram metadata changed
node detection-tools/es/load-runbooks.js                    # reload DETECT.md into scas-rules
```

---

## Documentation build & publishing

The site under [`docs/`](../../docs/) is GitHub Pages. Content folders are **symlinks** into `documentation/`, and [`docs-manifest.json`](../../docs/docs-manifest.json) drives the [`guide.html`](../../docs/guide.html) reader's sidebar.

```bash
# Replace docs/ symlinks with real copies before deploy
./scripts/materialize-docs-for-pages.sh
```

When adding or moving a documentation file, update in lockstep:

1. The relevant section `index.md` (and [`documentation/index.md`](../index.md) map if a new section).
2. [`docs/docs-manifest.json`](../../docs/docs-manifest.json) — add the page to the right group.
3. [`docs/sitemap.xml`](../../docs/sitemap.xml) — add notable new URLs.
4. [`scripts/materialize-docs-for-pages.sh`](../../scripts/materialize-docs-for-pages.sh) — add the folder if it's a new top-level section.

---

## Related

- [Operations](./OPERATIONS.md) — day-two lab workflow, ports, troubleshooting
- [Detection & observability](./DETECTION_AND_OBSERVABILITY.md) — blue-team + Elasticsearch
- [CONTRIBUTING](../../CONTRIBUTING.md) — contribution workflow and DCO
- [↑ Documentation index](../index.md)
