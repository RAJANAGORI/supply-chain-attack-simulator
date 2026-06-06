# Zero-to-Hero — Scenario 14: Container Image Supply Chain Attack

1. Overview: Image layers can hide malicious code that executes at build or runtime.
2. Setup: `cd scenarios/14-container-image-supply-chain-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock attacker server: `node infrastructure/mock-server.js`
4. Build & run compromised image (local only):
   - `docker build -t compromised-image images/compromised-image`
   - `docker run --rm -e TESTBENCH_MODE=enabled --add-host=host.docker.internal:host-gateway compromised-image`
5. Detect:
   - Static scan: `node detection-tools/image-scanner.js images/compromised-image`
   - Runtime: monitor mock server at `http://localhost:3002/captured-data`
6. Response: use image signing (notary/cosign), provenance verification, immutable tags, vulnerability scanning, and strict CI/CD policies.

Exercises:
- Implement a CI check that verifies image signatures before deployment.
- Create an image diff tool that compares layers between a trusted and suspect image.



---

## Elasticsearch + Kibana observability (optional)

Scenario **14 — Container Image Supply Chain** is indexed in Elasticsearch when the observability stack is running.

Container supply chain: compromised-image entrypoint sends build-time payload to mock-server :3002.

- **Detection runbook (static)** → index `scas-rules`, document id `14` — IOCs, Sigma, YARA, sample logs from `DETECT.md`
- **Runtime captures (dynamic)** → index `scas-detections` — one document per exfil event when `SCAS_ES_URL` is set before starting the mock collector

### How to read this diagram

| Phase | What you should look for |
|-------|--------------------------|
| **1 — Collectors** | Terminal A starts the mock server (or harvester). Set `SCAS_ES_URL` here if you want live Elasticsearch indexing. |
| **2 — Lab execution** | Terminal B runs the scenario README steps. Numbered arrows follow the attack path in order. |
| **3 — Exfiltration** | Malicious sample sends **localhost-only** JSON to the mock endpoint. Evidence is always written to `infrastructure/` on disk. |
| **4 — Elasticsearch** | When `SCAS_ES_URL` is set, the same capture is indexed into `scas-detections` with `scenario_id` and `event_type=exfil_capture`. |
| **5 — Kibana** | Use the per-scenario saved searches to compare **runtime captures** (Detections) with the **static runbook** (Rules). |

> **Safety:** All network calls stay on `127.0.0.1`. Malicious logic runs only when `TESTBENCH_MODE=enabled`.

### End-to-end flow

```mermaid
sequenceDiagram
    autonumber
    participant Learner as Learner (you)
    participant Victim as compromised-image
    participant MalPkg as compromised-image layer
    participant Mock as mock-server :3002
    participant ES as Elasticsearch :9200
    participant Kibana as Kibana :5601

    Note over Learner,Mock: Phase 1 — Start collectors (Terminal A)
    Learner->>Mock: export TESTBENCH_MODE=enabled
    Learner->>Mock: export SCAS_ES_URL=http://localhost:9200 (optional)
    Learner->>Mock: node infrastructure/mock-server.js
    Mock->>Mock: Listen for exfil POST on localhost

    Note over Learner,MalPkg: Phase 2 — Run the lab (Terminal B)
    Learner->>Learner: export TESTBENCH_MODE=enabled
    Learner->>Learner: export SCAS_ES_URL=http://localhost:9200 (optional)
    Learner->>Victim: TESTBENCH_MODE=enabled node images/compromised-image/malicious-start.js
    Victim->>MalPkg: Compromised image layer / entrypoint runs
    MalPkg->>MalPkg: Simulated container startup exfil stub
    Learner->>Victim: (Optional) docker run scas-compromised image

    Note over MalPkg,Mock: Phase 3 — Simulated exfiltration (127.0.0.1 only)
    Note over MalPkg: Malicious path gated by TESTBENCH_MODE=enabled
    MalPkg->>Mock: POST /capture JSON payload
    Mock->>Mock: Append to infrastructure/captured-data.json
    Mock-->>Learner: 200 OK (capture accepted)

    Note over Mock,Kibana: Phase 4 — Optional Elasticsearch indexing
    alt SCAS_ES_URL is set in Terminal A
    Mock->>ES: POST scas-detections (scenario_id=14, event_type=exfil_capture)
    ES->>ES: Store @timestamp, package, detail fields
    else SCAS_ES_URL not set
    Mock->>Mock: File-only capture (default lab behavior)
    end

    Note over ES: Runbook pre-seeded at scas-rules/_doc/14
    Note over Learner,Kibana: Phase 5 — Blue-team review in Kibana
    Learner->>Kibana: Open Discover → SCAS Detections — Scenario 14
    Kibana->>ES: Query scenario_id + sort by @timestamp desc
    ES-->>Kibana: Return capture events for this lab
    Learner->>Kibana: Open SCAS Rules — Scenario 14
    ES-->>Kibana: Return IOCs, Sigma, YARA from DETECT.md
    Learner->>Learner: Correlate capture detail with runbook IOCs
```

### Prerequisites

From the repository root:

```bash
./scripts/elasticsearch-up.sh
./scripts/setup-kibana-data-views.sh   # data views + saved searches for all 22 scenarios
```

### Run this scenario with live Elasticsearch forwarding

**Terminal A — mock collector** (from `scenarios/14-container-image-supply-chain-attack`):

```bash
cd scenarios/14-container-image-supply-chain-attack
export TESTBENCH_MODE=enabled
export SCAS_ES_URL=http://localhost:9200
node infrastructure/mock-server.js
```

**Terminal B — execute the lab:**

```bash
cd scenarios/14-container-image-supply-chain-attack
export TESTBENCH_MODE=enabled
export SCAS_ES_URL=http://localhost:9200
TESTBENCH_MODE=enabled node images/compromised-image/malicious-start.js
```

### Verify locally (file-based evidence)

```bash
curl -s http://localhost:3002/captured-data
```

### Verify in Elasticsearch (API)

```bash
# Static runbook for this scenario
curl -s "http://localhost:9200/scas-rules/_doc/14?pretty"

# Latest runtime capture events
curl -s "http://localhost:9200/scas-detections/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": { "term": { "scenario_id": "14" } },
    "sort": [{ "@timestamp": "desc" }],
    "size": 5
  }'
```

### Verify in Kibana (UI)

1. Open [http://localhost:5601](http://localhost:5601)
2. **Discover** → **SCAS Detections — Scenario 14** — live capture timeline (`@timestamp`, `package.name`, `detail`)
3. **Discover** → **SCAS Rules — Scenario 14** — compare against `iocs`, `sigma`, and `yara` fields
4. Ask: *Does each capture field match an IOC or Sigma condition in the runbook?*

See [observability/README.md](../../../observability/README.md) for stack details.
