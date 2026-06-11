# Detection and observability

How blue-team content, shared scanners, and the optional Elasticsearch + Kibana stack fit together.

## Three layers of detection content

| Layer | Location | Format | Indexed to ES |
|-------|----------|--------|---------------|
| **Runbooks** | `scenarios/*/DETECT.md` | IOCs, Sigma, YARA, sample logs | Yes → `scas-rules` |
| **Runtime captures** | `scenarios/*/infrastructure/captured-*.json` | JSON exfil events | Optional → `scas-detections` |
| **Scanners** | `detection-tools/` + per-scenario tools | CLI output, JSON, SARIF | Via shipper → `scas-detections` |

## DETECT.md runbooks (all 22 scenarios)

Each scenario includes a blue-team runbook at `scenarios/<folder>/DETECT.md`:

- Indicators of compromise (IOCs)
- Sample log lines (JSON)
- Sigma-style detection rules
- YARA-like text rules
- EDR/SIEM expectations

**Load into Elasticsearch:**

```bash
./scripts/elasticsearch-up.sh          # includes load-runbooks.js
# or manually:
node detection-tools/es/load-runbooks.js
```

Query runbook for scenario 01:

```bash
curl -s "http://localhost:9200/scas-rules/_doc/01?pretty"
```

## Shared detection tools

| Tool | Path | Purpose |
|------|------|---------|
| Package scanner | [`detection-tools/package-scanner.js`](../../detection-tools/package-scanner.js) | Typosquatting, lifecycle scripts, pattern scan; `--json` / `--sarif` |
| Network monitor | [`detection-tools/network-monitor.sh`](../../detection-tools/network-monitor.sh) | Watch Node.js outbound connections |
| ES shippers | [`detection-tools/es/`](../../detection-tools/es/) | Runbooks, captures, scanner findings → Elasticsearch |

### Package scanner examples

```bash
node detection-tools/package-scanner.js scenarios/01-typosquatting/victim-app
node detection-tools/package-scanner.js scenarios/01-typosquatting/victim-app --json
node detection-tools/package-scanner.js scenarios/01-typosquatting/victim-app --sarif
```

### Ship findings to Elasticsearch

```bash
node detection-tools/es/ship-findings.js scenarios/01-typosquatting/victim-app --scenario=01
node detection-tools/es/ship-captures.js    # backfill all captured-data.json files
```

## Optional observability stack (Elasticsearch + Kibana)

Full operational guide: [`observability/README.md`](../../observability/README.md)

### Quick start

```bash
./scripts/elasticsearch-up.sh
./scripts/setup-kibana-data-views.sh
export SCAS_ES_URL=http://localhost:9200
```

### Indices

| Index | Contents | Kibana data view |
|-------|----------|------------------|
| `scas-rules` | 22 DETECT.md runbooks | **SCAS Rules** (`ingested_at`) |
| `scas-detections` | Runtime captures + scanner findings | **SCAS Detections** (`@timestamp`) |

### Kibana saved searches

One pair per scenario (01–22):

- `SCAS Rules — Scenario NN`
- `SCAS Detections — Scenario NN`

Open **Discover** at [http://localhost:5601](http://localhost:5601).

### Live capture forwarding

When `SCAS_ES_URL` is set **before** starting the mock collector, each exfil event is indexed automatically via [`detection-tools/es/forward-capture.js`](../../detection-tools/es/forward-capture.js).

Zero-to-hero guides include per-scenario sequence diagrams under **Elasticsearch + Kibana observability**.

### Smoke validation

```bash
./scripts/smoke-observability.sh
```

## Scenario-local detectors

Many scenarios ship specialized tools under `scenarios/NN-*/detection-tools/`. See each scenario README and [CATALOG.md](../scenario-guides/CATALOG.md).

## Best practices for defenders

See [BEST_PRACTICES.md](./BEST_PRACTICES.md) for dependency pinning, registry scoping, CI checks, and incident response patterns.

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [OPERATIONS.md](./OPERATIONS.md)
- [observability/README.md](../../observability/README.md)
- [scenario-guides/CATALOG.md](../scenario-guides/CATALOG.md)
