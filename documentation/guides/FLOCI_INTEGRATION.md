# Floci integration guide (SCAS)

> [Documentation](../index.md) › [Integration guides](./index.md) › Floci

Optional **local AWS emulator** track for **all 23 scenarios**. Uses [Floci](https://github.com/floci-io/floci) core on port **4566** (not floci-ui — avoids clashes with SCAS mock servers on 3000–3023).

**First-time install?** Start with [Full-stack setup](../getting-started/FULL_STACK_SETUP.md) (Parts 1–3 cover SCAS, Elasticsearch, and Floci together).

The Floci helper scripts are also catalogued in [Tooling & doc maintenance](../platform/TOOLING.md#floci-cloud-track-optional).

## Initial setup (required once)

```bash
cd supply-chain-attack-simulator
./scripts/floci-setup.sh --image   # fast start
# or: ./scripts/floci-setup.sh     # full source build
```

Creates `infrastructure/floci/`, `.floci.env` (`SCAS_FLOCI_ENABLED=1`), and Docker orchestration for **`scas-floci`** on `:4566`.

## Quick start (every lab session)

```bash
./scripts/floci-up.sh && ./scripts/floci-status.sh
source .testbench.env && source .floci.env
cd scenarios/NN-slug
./infrastructure/floci/seed.sh
# ... run normal README steps ...
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh NN
```

## Architecture

| Layer | Role |
|-------|------|
| Mock server (`:3000`–`:3023`) | Primary exfil — always runs |
| `floci-exfil.js` / `floci_exfil.py` | Opt-in dual-write when `SCAS_FLOCI_ENABLED=1` |
| `scripts/floci-bridge.sh` | S3, ECR, Secrets, SQS, SNS, EventBridge, STS, ECS, IAM, CodePipeline, Step Functions, Glue, SSM, CloudWatch Logs |
| `detection-tools/floci/*` | Blue-team verify scripts |

**Safety:** Cloud exfil targets `127.0.0.1:4566` only; gated by `TESTBENCH_MODE=enabled`.

## Shared components

| Path | Purpose |
|------|---------|
| `scripts/floci-bridge.sh` | AWS emulator helpers (see file for full list) |
| `scripts/floci-upload-json.sh` | JSON → `s3://scas-scNN-artifacts/exfil/` |
| `detection-tools/floci/floci-exfil.js` | Node `uploadJson()` |
| `detection-tools/floci/floci_exfil.py` | Python `upload_json()` (scenario 22) |
| `detection-tools/floci/s3-exfil-check.sh` | S3 exfil detector (all scenarios) |
| `detection-tools/floci/ecr-check.sh` | ECR images (11, 14, 23) |
| `detection-tools/floci/stage-chain-check.sh` | S3 kill-chain markers (17) |
| `detection-tools/floci/eventbridge-chain-check.sh` | EventBridge + chain (17) |
| `detection-tools/floci/secrets-check.sh` | Secrets Manager (06, 10, 15) |
| `detection-tools/floci/cloudtrail-hunt.sh` | Cloud API abuse hunt (05, 23) |
| `detection-tools/floci/pipeline-artifact-check.sh` | CodePipeline (23) |

**Buckets:** `scas-sc01-artifacts` … `scas-sc23-artifacts`

## Scenario matrix

| # | Scenario | Floci services | Depth |
|---|----------|----------------|-------|
| 01–04, 07–10, 12–13, 15–16, 18, 20 | Standard npm/PyPI labs | **S3** exfil mirror | Universal |
| 21 | Axios postinstall | **S3** | Reference hook |
| 22 | LiteLLM PyPI | **S3** (Python) | Universal |
| 05 | Build compromise | **S3**, IAM, STS, SSM, CloudWatch Logs | Extended |
| 06 | Shai-Hulud | **S3**, Secrets Manager, SQS, SNS, EventBridge | Extended |
| 11 | Registry mirror | **S3**, **ECR** | Extended |
| 14 | Container image | **S3**, **ECR**, **ECS** | Extended |
| 17 | Multi-stage chain | **S3** chain, Step Functions, EventBridge | Extended |
| 19 | SBOM manipulation | **S3**, Glue, SSM (Athena), Config | Extended |
| 23 | Trivy compromise | **S3**, **ECR**, CodePipeline, IAM/STS, CloudWatch Logs | Capstone |

Per-scenario docs: `scenarios/NN-*/FLOCI.md`

### Universal track (S3 only)

Scenarios **01–04, 07–13, 15–16, 18–20, 22–23** mirror mock-server JSON to `s3://scas-scNN-artifacts/exfil/*` via `uploadJson()` / `floci_exfil.py` / `floci-upload-json.sh`.

### Extended tracks

| Scenario | Extra primitives | Key scripts |
|----------|------------------|-------------|
| 05 | CI IAM + logs | `infrastructure/floci/exfil.sh`, `cloudtrail-hunt.sh 05` |
| 06 | Worm fan-out | SQS/SNS/EventBridge in `seed.sh` |
| 11 | Private registry analog | ECR in `seed.sh` |
| 14 | Runtime trust | `push-compromised.sh`, `run-compromised-task.sh` |
| 17 | Orchestrated chain | Step Functions + `eventbridge-chain-check.sh` |
| 19 | SBOM analytics | `truth/` vs `sbom/` prefixes, Glue DB |
| 23 | CI/CD capstone | `push-compromised.sh`, `pipeline-artifact-check.sh` |

## Port conflicts

SCAS runs **`scas-floci` on 4566 only** — not floci-ui (`:3000`/`:4500`). SCAS mock servers use 3000–3023.

## Scripts reference

| Script | Purpose |
|--------|---------|
| `scripts/floci-setup.sh` | Install Floci (`--image` for fast start) |
| `scripts/floci-up.sh` / `floci-down.sh` / `floci-status.sh` | Lifecycle |
| `scripts/floci-bridge.sh` | Shared AWS helpers |
| `scenarios/NN-*/infrastructure/floci/seed.sh` | Per-scenario baseline |
| `scenarios/NN-*/infrastructure/floci/verify.sh` | Blue-team evidence |

## Related

- [Integration guides index](./index.md)
- [Operations](../platform/OPERATIONS.md) · [Scenario catalog](../scenario-guides/CATALOG.md)
- [↑ Documentation index](../index.md)
