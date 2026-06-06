# Optional Elasticsearch + Kibana observability stack (issue #22).
#
# Education / localhost only. Security (TLS + auth) is disabled by default so
# workshop participants can focus on detection content rather than cluster ops.

## Quick start

From the repo root:

```bash
chmod +x scripts/elasticsearch-up.sh scripts/elasticsearch-down.sh
./scripts/elasticsearch-up.sh
```

This will:

1. Start Elasticsearch (`:9200`) and Kibana (`:5601`) via Docker Compose
2. Apply index templates for `scas-rules` and `scas-detections`
3. Load all 22 scenario `DETECT.md` runbooks into `scas-rules`

Open Kibana at [http://localhost:5601](http://localhost:5601).

**Automated setup (recommended):**

```bash
./scripts/setup-kibana-data-views.sh
```

This creates:

| Data view | Index | Timestamp field |
|-----------|-------|-----------------|
| SCAS Rules | `scas-rules` | `ingested_at` |
| SCAS Detections | `scas-detections` | `@timestamp` |

Plus **44 saved searches** — for each scenario 01–22:

- `SCAS Rules — Scenario XX` (detection runbook / IOCs / Sigma / YARA)
- `SCAS Detections — Scenario XX` (runtime capture events)

Open **Discover** and pick any saved search, or filter manually on `scenario_id`.

**Manual setup** (if you prefer):

| Index | Purpose |
|-------|---------|
| `scas-rules` | Detection techniques (IOCs, Sigma, YARA, sample logs) |
| `scas-detections` | Runtime events (scanner findings, exfil captures) |

## Live capture forwarding (opt-in)

Mock attacker servers forward captures to Elasticsearch only when you set:

```bash
export SCAS_ES_URL=http://localhost:9200
```

Without this variable, scenarios behave exactly as before (JSON files on disk only).

## Ship detection events manually

```bash
# Scanner findings from a victim app
node detection-tools/es/ship-findings.js scenarios/01-typosquatting/victim-app --scenario=01

# Backfill existing captured-data.json files
node detection-tools/es/ship-captures.js
```

## Smoke check

With the stack running:

```bash
./scripts/smoke-observability.sh
```

## Stop the stack

```bash
./scripts/elasticsearch-down.sh
```

Remove persisted cluster data:

```bash
./scripts/elasticsearch-down.sh --volumes
```

## Index reference

### `scas-rules`

Parsed from `scenarios/*/DETECT.md`:

- `scenario_id`, `scenario_name`, `title`
- `iocs[]`, `sigma`, `yara`, `sample_logs[]`, `edr_expectations`
- `mitre.tactic`, `mitre.technique` (placeholders for future MITRE mapping)

### `scas-detections`

Runtime events with ECS-flavored fields:

- `@timestamp`, `scenario_id`, `event_type` (`scanner_finding` | `exfil_capture`)
- `severity`, `message`, `rule.id`, `source`, `destination`, `package.*`, `detail`

## Safety

- Do not expose ports `9200` / `5601` outside an isolated lab VM.
- `xpack.security.enabled=false` is intentional for local workshops only.
- This stack stores educational simulation data, not production telemetry.
