# SCAS Dashboard (optional localhost UI)

The CLI remains the canonical way to run labs. The dashboard is an optional control plane for learners who prefer a browser UI.

## Stack

| Service | URL | Role |
|---------|-----|------|
| Landing (Vite) | http://0.0.0.0:5173 | Multi-section motion marketing site + **Start Dashboard** CTA (editable copy in `apps/landing/src/content/site.ts`) |
| Dashboard (Next.js) | http://0.0.0.0:3100 | Scenario catalog, service controls, live logs |
| Control plane | http://0.0.0.0:3101 | Process supervisor, WebSocket logs, capture proxy |

Landing and dashboard share the **public docs theme** (`apps/design-tokens/`) with a **light/dark toggle** (same `localStorage` key as docs: `scas-theme`). Control plane is API-only and has no UI chrome.

## LAN access

Services bind on `0.0.0.0`. Use `localhost` on the same machine, or your LAN IP from another device (e.g. `http://192.168.1.14:3100`).

The dashboard **proxies** all control-plane API and WebSocket traffic through port **3100** (`/api/cp/*`, `/ws/logs` → `127.0.0.1:3101`). You only need port **3100** reachable over LAN - port 3101 can stay loopback-only.

`start-dashboard.sh` auto-detects your LAN IP and configures Next.js `allowedDevOrigins` for dev mode.

## Quick start

From the repository root (after `./scripts/setup/setup.sh`):

```bash
chmod +x scripts/ui/start-dashboard.sh
./scripts/ui/start-dashboard.sh
```

Or run components separately:

```bash
npm install
npm run dev:control-plane   # terminal 1 - 0.0.0.0:3101
npm run dev:dashboard       # terminal 2 - 0.0.0.0:3100
npm run dev:landing         # terminal 3 - 0.0.0.0:5173
```

Then open:

- Landing: http://0.0.0.0:5173 (or http://localhost:5173)
- Dashboard: http://0.0.0.0:3100
- Control plane health: http://0.0.0.0:3101/api/health

**Control plane not loading?** Verify:

```bash
curl http://0.0.0.0:3101/api/health
# → {"ok":true,"port":3101,...}
```

## Safety

- UI services bind to **0.0.0.0** for local/LAN access - use only in isolated lab environments.
- All spawned lab processes receive `TESTBENCH_MODE=enabled`.
- Scenario payload exfiltration remains **127.0.0.1** only; the dashboard proxies existing mock APIs.
- Do not expose the control plane to untrusted networks.

## What the dashboard can do

- **Welcome** - product pitch and safety model inside the dashboard (`/welcome`) so the Vite landing site is optional
- **Labs workspace** - guided storyboard for all **25** scenarios via `lesson.yaml` (Red / Blue / Purple roles, hints, verify gates, live inspector)
- **Observatory** (`/observe`) - Elasticsearch `scas-detections` timeline when the stack is up
- **Skills** (`/skills`) - category matrix with Markdown/JSON export
- **Briefing** (`/report`) - completion report with browser Print / PDF
- **Classroom** (`/classroom`) - session code, join board, freeze for debrief (single control plane; not per-student isolation yet)
- **Lab coach** - in-lab assistant (offline context by default; set `SCAS_AI_URL` + `SCAS_AI_API_KEY` for a live OpenAI-compatible model)
- Stream stdout/stderr over WebSocket in the Labs dock
- Persist progress under `~/.scas/progress.json`
- Start/stop Elasticsearch, Kibana, Floci; global teardown

## Guided lessons (`lesson.yaml`)

Every lab under `scenarios/NN-slug/` ships `lesson.yaml`. Teaching metadata only:

- Steps point at registry actions (`setup`, `services`, or a step id from `apps/control-plane/src/registry/scenarios.ts`)
- Commands stay in the TypeScript registry; README.md remains the CLI source of truth
- Verify rules: `exit-zero`, `service-listening`, `capture-count`
- Validate with `node scripts/docs/check-lesson-yaml.js` (smoke CI)

## App boundaries (current merge state)

| Piece | Role |
|-------|------|
| Dashboard (Next.js :3100) | Primary learner UI (welcome, labs, observe, skills, briefing, classroom) |
| Control plane (Express :3101) | Process supervisor, lessons, progress, classroom, assistant, ES proxy |
| Landing (Vite :5173) | Optional marketing shell; CTA still points at the dashboard |

Full process merge (Next API routes spawning labs) is intentionally not done - the supervisor stays in the control plane for safety and WebSocket log streaming.

## Project layout

```
apps/
├── design-tokens/    # Shared SCAS brand tokens (Realtime Colors palette)
├── landing/          # Optional Vite marketing site
├── dashboard/        # Next.js learning platform UI
└── control-plane/    # Express + WS + registry + lesson/classroom/skills APIs
```
