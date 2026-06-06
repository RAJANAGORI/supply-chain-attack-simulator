# Zero-to-Hero — Scenario 21: Axios-style compromised npm release

1. **Overview**: A trusted package patch can add a **transitive** your app never imports; **`postinstall`** still runs. This lab uses fictional **`axios-like`** / **`plain-crypto-js-like`** and **localhost** beacons only.
2. **Setup**: `cd scenarios/21-axios-compromised-release-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
3. **Mock server**: `node infrastructure/mock-server.js` (port **3021**)
4. **Malicious upgrade**: `cd victim-app && export TESTBENCH_MODE=enabled && npm install axios-like@file:../packages/axios-like-1.14.1.tgz`
5. **Run victim**: `npm start` — note the parent never `require()`s the transitive.
6. **Evidence**: `curl http://localhost:3021/captured-data` · `cat .testbench-axios-ioc.json`
7. **Detect**: `node detection-tools/axios-compromise-detector.js .` (from `victim-app` or pass path)
8. **Response**: pin exact versions, lockfile-only CI, review **`INIT_CWD`** vs nested `cwd` for lifecycle forensics, rotate tokens after real incidents.

**Exercises**

- Explain why **`bundledDependencies` + `npm pack`** is used in this lab to ensure the nested package installs.
- List three **IOC** fields you would hunt in a real org after an npm supply-chain alert.


---

## Elasticsearch + Kibana observability (optional)

Scenario **21 — Axios-style Compromised Release** is indexed in Elasticsearch when the observability stack is running.

Axios-style release: axios-like@1.14.1 bundles a transitive with postinstall; beacon goes to /beacon.

- **Detection runbook (static)** → index `scas-rules`, document id `21` — IOCs, Sigma, YARA, sample logs from `DETECT.md`
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
    participant Victim as victim-app
    participant MalPkg as axios-like@1.14.1 (transitive)
    participant Mock as mock-server :3021
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
    Learner->>Victim: npm install axios-like@file:../packages/axios-like-1.14.1.tgz
    Victim->>MalPkg: Transitive plain-crypto-js-like postinstall runs
    Learner->>Victim: npm start (parent never imports transitive directly)
    MalPkg->>MalPkg: Write .testbench-axios-ioc.json + beacon payload

    Note over MalPkg,Mock: Phase 3 — Simulated exfiltration (127.0.0.1 only)
    Note over MalPkg: Malicious path gated by TESTBENCH_MODE=enabled
    MalPkg->>Mock: POST /beacon JSON payload
    Mock->>Mock: Append to infrastructure/captured-data.json
    Mock-->>Learner: 200 OK (capture accepted)

    Note over Mock,Kibana: Phase 4 — Optional Elasticsearch indexing
    alt SCAS_ES_URL is set in Terminal A
    Mock->>ES: POST scas-detections (scenario_id=21, event_type=exfil_capture)
    ES->>ES: Store @timestamp, package, detail fields
    else SCAS_ES_URL not set
    Mock->>Mock: File-only capture (default lab behavior)
    end

    Note over ES: Runbook pre-seeded at scas-rules/_doc/21
    Note over Learner,Kibana: Phase 5 — Blue-team review in Kibana
    Learner->>Kibana: Open Discover → SCAS Detections — Scenario 21
    Kibana->>ES: Query scenario_id + sort by @timestamp desc
    ES-->>Kibana: Return capture events for this lab
    Learner->>Kibana: Open SCAS Rules — Scenario 21
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

**Terminal A — mock collector** (from `scenarios/21-axios-compromised-release-attack`):

```bash
cd scenarios/21-axios-compromised-release-attack
export TESTBENCH_MODE=enabled
export SCAS_ES_URL=http://localhost:9200
node infrastructure/mock-server.js
```

**Terminal B — execute the lab:**

```bash
cd scenarios/21-axios-compromised-release-attack
export TESTBENCH_MODE=enabled
export SCAS_ES_URL=http://localhost:9200
cd victim-app && npm install axios-like@file:../packages/axios-like-1.14.1.tgz && npm start
```

### Verify locally (file-based evidence)

```bash
curl -s http://localhost:3021/captured-data
```

### Verify in Elasticsearch (API)

```bash
# Static runbook for this scenario
curl -s "http://localhost:9200/scas-rules/_doc/21?pretty"

# Latest runtime capture events
curl -s "http://localhost:9200/scas-detections/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": { "term": { "scenario_id": "21" } },
    "sort": [{ "@timestamp": "desc" }],
    "size": 5
  }'
```

### Verify in Kibana (UI)

1. Open [http://localhost:5601](http://localhost:5601)
2. **Discover** → **SCAS Detections — Scenario 21** — live capture timeline (`@timestamp`, `package.name`, `detail`)
3. **Discover** → **SCAS Rules — Scenario 21** — compare against `iocs`, `sigma`, and `yara` fields
4. Ask: *Does each capture field match an IOC or Sigma condition in the runbook?*

See [observability/README.md](../../../observability/README.md) for stack details.
