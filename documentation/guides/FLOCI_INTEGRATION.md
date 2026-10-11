# Floci integration guide (SCAS)

> [Documentation](../index.md) › [Integration guides](./index.md) › Floci

Optional **local AWS emulator** track for **all 25 scenarios**. Uses [Floci](https://github.com/floci-io/floci) core on port **4566**. Labs work via **CLI/seed scripts** and via the **Floci web console** at `/_floci/ui` (spawns `floci-ui` on host port **4500** when the Docker socket is reachable).

**First-time install?** Start with [Full-stack setup](../getting-started/FULL_STACK_SETUP.md) (Parts 1-3 cover SCAS, Elasticsearch, and Floci together).

The Floci helper scripts are also catalogued in [Tooling & doc maintenance](../platform/TOOLING.md#floci-cloud-track-optional).

## Initial setup (required once)

```bash
cd supply-chain-attack-simulator
./scripts/floci/floci-setup.sh --image   # fast start
# or: ./scripts/floci/floci-setup.sh     # full source build
```

Creates `infrastructure/floci/`, `.floci.env` (`SCAS_FLOCI_ENABLED=1`), and Docker orchestration for **`scas-floci`** on `:4566`.

## Quick start (every lab session)

```bash
./scripts/floci/floci-up.sh && ./scripts/floci/floci-status.sh
source .testbench.env && source .floci.env
cd scenarios/NN-slug
./infrastructure/floci/seed.sh
# ... run normal README steps ...
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh NN
```

When a payload or a seed/verify script actually calls the Floci CLI, the terminal prints an `SCAS runner: Floci CLI` banner with the scenario id, the endpoint, and the bucket `s3://scas-scNN-artifacts`. After the S3 put, the same run lists the extra services it wrote (logs, events, sqs, sns, sts, iam). The lab page shows that set for the scenario you have open. `SCAS_FLOCI_ENABLED` unset means the attack step does not call any of it.

## Architecture

| Layer | Role |
|-------|------|
| Mock server (`:3000`-`:3023`) | Primary exfil - always runs |
| `floci-exfil.js` / `floci_exfil.py` | Opt-in dual-write when `SCAS_FLOCI_ENABLED=1` |
| `scripts/floci/floci-bridge.sh` | S3, ECR, Secrets, SQS, SNS, EventBridge, STS, ECS, IAM, CodePipeline, Step Functions, Glue, SSM, CloudWatch Logs |
| `detection-tools/floci/*` | Blue-team verify scripts |

**Safety:** Cloud exfil targets `127.0.0.1:4566` only; gated by `TESTBENCH_MODE=enabled`.

## Shared components

| Path | Purpose |
|------|---------|
| `scripts/floci/floci-bridge.sh` | AWS emulator helpers + `scas_floci_seed_lookalike_secrets` |
| `scenarios/_shared/generate-lookalike-secrets.py` | Generates LAB-ONLY lookalike tokens locally (gitignored outputs) |
| `scenarios/_shared/ensure-lookalike-secrets.sh` | Create `lookalike-secrets.{env,json}` if missing |
| `scenarios/_shared/plant-lookalike-secrets.sh` | Plant victim `.npmrc` / `.env` fixtures (05, 06, 21, 23) |
| `scenarios/_shared/LOOKALIKE_SECRETS.md` | How generated lookalikes work |
| `scripts/floci/floci-upload-json.sh` | JSON → `s3://scas-scNN-artifacts/exfil/` |
| `detection-tools/floci/floci-exfil.js` | Node `uploadJson()` |
| `detection-tools/floci/floci_exfil.py` | Python `upload_json()` (scenario 22) |
| `detection-tools/floci/s3-exfil-check.sh` | S3 exfil detector (all scenarios) |
| `detection-tools/floci/ecr-check.sh` | ECR images (11, 14, 23) |
| `detection-tools/floci/stage-chain-check.sh` | S3 kill-chain markers (17) |
| `detection-tools/floci/eventbridge-chain-check.sh` | EventBridge + chain (17) |
| `detection-tools/floci/secrets-check.sh` | Secrets Manager (06, 10, 15) |
| `detection-tools/floci/cloudtrail-hunt.sh` | Cloud API abuse hunt (05, 23) |
| `detection-tools/floci/pipeline-artifact-check.sh` | CodePipeline (23) |

**Buckets:** `scas-sc01-artifacts` ... `scas-sc25-artifacts`

## Scenario matrix

Every `seed.sh` calls `scas_floci_enrich_seed`. That provisions, on the local emulator, an IAM role, an SSM parameter, an SQS queue, an SNS topic, a CloudWatch log line, and an EventBridge seed event. A payload upload then calls `scas_floci_enrich_exfil`, which writes the log, the event, an SQS message, an SNS message, and an STS caller check.

| # | Scenario | Extra services beyond that shared set |
|---|----------|----------------------------------------|
| 01, 03, 04, 15, 24 | npm-shaped labs | Secrets Manager lookalike token |
| 09 | Signing bypass | SSM signing-key id, Secrets Manager object |
| 22 | LiteLLM PyPI | Secrets Manager lookalike token |
| 05, 08, 10, 12, 21, 25 | CI-shaped labs | CodePipeline. 05, 21, and 25 also store lookalike CI secrets |
| 06 | Shai-Hulud | Existing worm SQS, SNS, EventBridge, and lookalike secrets |
| 11, 14, 23 | Image labs | ECR. 14 also has an ECS cluster. 23 also has CodePipeline |
| 17 | Multi-stage chain | Stage queues, CodePipeline, plus the existing Step Functions state machine |
| 19 | SBOM manipulation | Existing Glue database and SBOM SSM parameter |
| 02, 07, 13, 16, 18, 20 | Other package labs | Shared set only |

Per-scenario docs: `scenarios/NN-*/FLOCI.md`

### Upload path

Scenarios that call `uploadJson()` or `floci_exfil.py` mirror the mock-server JSON to `s3://scas-scNN-artifacts/exfil/*`, then `scas_floci_enrich_exfil` writes the log, event, queue, topic, and STS check. Labs 05 and 20 call that same upload from the payload when `SCAS_FLOCI_ENABLED=1`.

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

## CLI and web console

Both paths use the same emulator:

| Path | How |
|------|-----|
| CLI / scripts | `aws` / `awslocal` via `scripts/floci/floci-bridge.sh`, plus per-lab `infrastructure/floci/seed.sh` and `verify.sh` |
| Web console | Open `http://127.0.0.1:4566/_floci/ui` (dashboard **Open UI**). First visit may pull `floci/floci-ui` and publish it on **:4500**. |

Mock servers stay on **3000-3023**. Floci API stays on **4566**. The UI sidecar uses **4500**, which does not overlap those mocks.

If `/_floci/ui` shows `BindException: Permission denied`, recreate Floci so the Docker socket is usable:

```bash
./scripts/floci/floci-up.sh   # sets DOCKER_GID + FLOCI_RUN_AS_ROOT=true, remounts sock with :z
```

## Port map

| Port | Role |
|------|------|
| 4566 | Floci AWS API + `/_floci/health` + `/_floci/ui` entry |
| 4500 | floci-ui sidecar (started on demand from `/_floci/ui`) |
| 3000-3023 | SCAS scenario mock servers (unchanged) |

## Scripts reference

| Script | Purpose |
|--------|---------|
| `scripts/floci/floci-setup.sh` | Install Floci (`--image` for fast start) |
| `scripts/floci/floci-up.sh` / `floci-down.sh` / `floci-status.sh` | Lifecycle |
| `scripts/floci/floci-bridge.sh` | Shared AWS helpers |
| `scenarios/NN-*/infrastructure/floci/seed.sh` | Per-scenario baseline |
| `scenarios/NN-*/infrastructure/floci/verify.sh` | Blue-team evidence |

## Related

- [Integration guides index](./index.md)
- [Operations](../platform/OPERATIONS.md) · [Scenario catalog](../scenario-guides/CATALOG.md)
- [↑ Documentation index](../index.md)
