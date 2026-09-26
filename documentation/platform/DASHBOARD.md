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

- **Labs workspace** - scenario controls and a pinned live terminal on the same page (run Prepare / Execute while watching stdout/stderr)
- List and run all **25** scenarios (setup, start mocks/registries, attack steps, full lab)
- Stream stdout/stderr over WebSocket in the Labs dock (legacy `/console` and `/output` redirect here)
- Display capture JSON from mock servers on the Observe tab
- Start/stop Elasticsearch, Kibana (via existing scripts), Floci
- Run per-scenario Floci seed/verify where configured
- Global teardown via `scripts/setup/teardown.sh`

## Project layout

```
apps/
├── design-tokens/    # Shared SCAS brand tokens (Realtime Colors palette)
├── landing/          # Vite + React + Motion-Primitives-style motion site
├── dashboard/        # Next.js + Tailwind (same brand tokens)
└── control-plane/    # Express + WS + scenario registry
```
