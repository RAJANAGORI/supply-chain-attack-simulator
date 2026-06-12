# Floci integration guide (SCAS)

Optional **local AWS emulator** track for scenarios **05, 06, 14, 17, 21**. Uses [Floci](https://github.com/floci-io/floci) on port **4566**.

## Initial setup (required once)

All cloud-track labs need Floci running. Setup is **built into this repo** — no separate floci monorepo required.

```bash
cd supply-chain-attack-simulator

# Option A — clone floci-io/floci + build (full source, ~5–15 min first time)
./scripts/floci-setup.sh

# Option B — fast start with published Docker image (no clone)
./scripts/floci-setup.sh --image
```

This creates:

- `vendor/floci-aws/` — clone of floci-io/floci (Option A only)
- `infrastructure/floci/` — Docker Compose orchestration
- `.floci.env` — `SCAS_FLOCI_ENABLED=1` and AWS endpoint exports

## Quick start (every lab session)

```bash
# Terminal 1 — start emulator
./scripts/floci-up.sh
./scripts/floci-status.sh

# Terminal 2 — scenario lab
source .testbench.env    # TESTBENCH_MODE=enabled
source .floci.env        # SCAS_FLOCI_ENABLED=1
cd scenarios/05-build-compromise
./infrastructure/floci/seed.sh
# ... run normal README steps ...
./infrastructure/floci/verify.sh

# When done
./scripts/floci-down.sh
```

## Shared components

| Path | Purpose |
|------|---------|
| `scripts/floci-bridge.sh` | Health, S3, ECR, Secrets Manager helpers |
| `scripts/floci-upload-json.sh` | JSON → `s3://scas-scNN-artifacts/` |
| `detection-tools/floci/floci-exfil.js` | Node `uploadJson()` for packages |
| `detection-tools/floci/s3-exfil-check.sh` | Blue-team S3 exfil detector |
| `detection-tools/floci/ecr-check.sh` | Blue-team ECR detector (14) |
| `detection-tools/floci/stage-chain-check.sh` | Blue-team kill-chain (17) |

**Opt-in:** `SCAS_FLOCI_ENABLED=1` — default smoke tests unchanged.

**Buckets:** `scas-sc05-artifacts` … `scas-sc21-artifacts`

---

## Scenario 05 — Build compromise ✅

| Floci | Mock (unchanged) |
|-------|------------------|
| S3 `exfil/build-secrets-*`, `releases/compromised/*` | `POST :3000/collect` |

Docs: `scenarios/05-build-compromise/FLOCI.md`

---

## Scenario 06 — Shai-Hulud ✅

| Floci | Mock (unchanged) |
|-------|------------------|
| S3 `exfil/harvested-credentials-*` | `:3001/collect` |
| Secrets Manager decoy `scas/sc06/decoy-npm-token` | — |

Hook: `templates/bundle.js` mirrors harvest JSON to S3.

Docs: `scenarios/06-sha-hulud/FLOCI.md`

---

## Scenario 14 — Container image ✅

| Floci | Mock (unchanged) |
|-------|------------------|
| S3 `exfil/runtime-beacon-*` | `POST :3002/capture` |
| ECR `scas-sc14-app:compromised` via `push-compromised.sh` | — |

Hooks: `malicious-start.js` → S3; manual ECR push after `docker build`.

Docs: `scenarios/14-container-image-supply-chain-attack/FLOCI.md`

---

## Scenario 17 — Multi-stage chain ✅

| Floci | Mock (unchanged) |
|-------|------------------|
| S3 `chain/stage{1,2,3}/*` + `exfil/*` | `:3017/collect` |

Hooks: `stage1-access-lib`, `stage2-compromised-lib` → `uploadJson()`.

Detector: `detection-tools/floci/stage-chain-check.sh`

Docs: `scenarios/17-multi-stage-attack-chain/FLOCI.md`

---

## Scenario 21 — Axios postinstall ✅

| Floci | Mock (unchanged) |
|-------|------------------|
| S3 `exfil/postinstall-beacon-*` | `POST :3021/beacon` |

Hook: `packages/plain-crypto-js-like/postinstall.js`

Docs: `scenarios/21-axios-compromised-release-attack/FLOCI.md`

---

## Port conflicts

SCAS uses container **`scas-floci`** on **4566 only** — it does not start floci-ui (3000/3001), so SCAS mock servers on 3000–3022 are safe.

If you also run an external `floci` stack, stop one of them to avoid port 4566 conflicts.

## Scripts reference

| Script | Purpose |
|--------|---------|
| `scripts/floci-setup.sh` | Clone vendor + build, or `--image` for published container |
| `scripts/floci-up.sh` | Start emulator and wait for health |
| `scripts/floci-down.sh` | Stop emulator |
| `scripts/floci-status.sh` | Health + container status |
| `scripts/floci-bridge.sh` | Sourced by scenario seed/verify scripts |
