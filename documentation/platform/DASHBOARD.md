# SCAS Dashboard (optional localhost UI)

The CLI remains the canonical way to run labs. The dashboard is an optional control plane for learners who prefer a browser UI.

## Stack

| Service | URL | Role |
|---------|-----|------|
| Public marketing | https://simulator.rajanagori.in/ | Product / docs landing (not started by local UI scripts) |
| Dashboard (Next.js) | http://0.0.0.0:3100 | Scenario catalog, service controls, live logs |
| Control plane | http://0.0.0.0:3101 | Process supervisor, WebSocket logs, capture proxy |

Dashboard uses the shared public docs theme (`apps/design-tokens/`) with a light/dark toggle (same `localStorage` key as docs: `scas-theme`). Control plane is API-only and has no UI chrome.

## LAN access

Services bind on `0.0.0.0`. Open the dashboard with the lab host address (for example `http://192.168.64.2:3100`), not only `localhost`, when you browse from another machine.

The dashboard proxies control-plane API and WebSocket traffic through port 3100 (`/api/cp/*`, `/ws/logs` → `127.0.0.1:3101` on the server). You only need port 3100 reachable over LAN. Port 3101 can stay loopback-only.

Browser-facing service links (Overview Platform stack, Observatory Open Kibana) rewrite loopback URLs to the hostname in the address bar. So if you opened `http://192.168.64.2:3100`, Kibana opens as `http://192.168.64.2:5601`. Server-side health probes still use `127.0.0.1` on the lab host. Payload exfil in captures still shows `127.0.0.1` on purpose (TESTBENCH safety).

Also open these ports on the lab host / VM firewall when you demo over LAN: 3100, 5601 (Kibana), 9200 (optional direct ES), 4566 (Floci).

`start-dashboard.sh` auto-detects a LAN IP and configures Next.js `allowedDevOrigins` for dev mode.

## Quick start

Full stack (recommended for Observatory + Floci + UI): Docker must be running, then from the repository root:

```bash
chmod +x run.sh scripts/ui/run-everything.sh
./run.sh
```

That one command runs core setup, Elasticsearch/Kibana, Floci, installs `act` when missing (Homebrew or GitHub release into `.tools/bin`), writes `.scas.env` with `SCAS_ACT_REQUIRED=1`, and starts the dashboard with `SCAS_ES_URL` exported into the control plane. Labs 05 and 25 then run real workflows via `act` instead of the npm stand-in (override with `SCAS_SKIP_ACT=1` or `./run.sh --skip-act`).

Flags: `--core-only` (UI without ES/Floci), `--skip-es`, `--skip-floci`, `--skip-act`, `--no-ui`, `--skip-setup`.

Noninteractive setup (CI, SSH, no TTY): `CI=1` or `SCAS_YES=1` skips the `setup.sh` y/N prompt. Piped stdin also auto-accepts.

Conference / remote lab host smoke (after clone + Docker + Node):

```bash
chmod +x scripts/ui/conference-demo-up.sh
./scripts/ui/conference-demo-up.sh
```

UI only (after `./scripts/setup/setup.sh` or with `SCAS_YES=1`):

```bash
chmod +x scripts/ui/start-dashboard.sh
./scripts/ui/start-dashboard.sh
```

Or run components separately:

```bash
npm install
npm run dev:control-plane   # terminal 1 - 0.0.0.0:3101
npm run dev:dashboard       # terminal 2 - 0.0.0.0:3100
```

Then open:

- Dashboard: http://0.0.0.0:3100 (or http://localhost:3100)
- Welcome: http://localhost:3100/welcome
- Control plane health: http://127.0.0.1:3101/api/health
- Marketing (public): https://simulator.rajanagori.in/

The Vite app under `apps/landing` is optional local packaging only (`npm run dev:landing`). Default stacks do not start port 5173.

Control plane not loading? Verify:

```bash
curl http://127.0.0.1:3101/api/health
# → {"ok":true,"port":3101,...}
```

## Safety

- UI services bind to 0.0.0.0 for local/LAN access - use only in isolated lab environments.
- All spawned lab processes receive `TESTBENCH_MODE=enabled`.
- Scenario payload exfiltration remains 127.0.0.1 only; the dashboard proxies existing mock APIs.
- Do not expose the control plane to untrusted networks.

## What the dashboard can do

- Welcome - product pitch and safety model inside the dashboard (`/welcome`)
- Labs workspace - guided storyboard for all 25 scenarios via `lesson.yaml` (Red / Blue / Purple roles, hints, verify gates, live inspector)
- Spot-the-attack drill - blind review of an unlabeled diff / registry page / CI log before the storyboard labels anything (`drill` block in `lesson.yaml`)
- Breach moment - captured exfil rendered as a consequence (blast radius, leak-site paste) in the live inspector and the briefing
- Purple-team reversal - author a `dependency-guard.json` blocklist, then re-run the attack against it to prove the control holds (`reversal` block)
- Quiz gate - 2-3 blue-team questions from the lab's DETECT.md after the storyboard verifies (`quiz` block); feeds the assessment score
- Campaign (`/campaign`) - chains labs into one continuous intrusion under a persistent attacker persona (`campaigns/*.yaml`)
- Briefing (`/report`) - incident report with timeline reconstruction, blast radius, real-incident cost mapping, score, badges, and a printable certificate
- Live terminal - side-by-side by default (drag the splitter to resize; Side / Bottom toggle; SM/MD/LG presets). Collapses to a thin bar when you do not need logs
- Observatory (`/observe`) - Elasticsearch `scas-detections` timeline when the stack is up
- Skills (`/skills`) - category matrix with Markdown/JSON export
- Classroom (`/classroom`) - session code, leaderboard sorted by assessment points, freeze for debrief (single control plane; not per-student isolation yet)
- Lab coach - in-lab assistant (offline context by default; set `SCAS_AI_URL` + `SCAS_AI_API_KEY` for a live OpenAI-compatible model)
- Stream stdout/stderr over WebSocket in the Labs dock
- Persist progress under `~/.scas/progress.json` (steps, hints, quiz and drill results)
- Start/stop Elasticsearch, Kibana, Floci; global teardown

### Check inspector (detect steps)

Steps with `registry: null` (usually the last detect / harden step) call Check inspector. That re-runs lesson verify, scrolls to Live inspector, and shows a short status line. If the step is already verified and there is no next step, you still get that scroll + note (it is not a no-op).

### Reset lab and the terminal

Reset lab (`/teardown` or Overview) runs `scripts/setup/teardown.sh`. When that job finishes, the control plane clears the live log buffer and open terminals wipe over the WebSocket. Clear in the dock header calls the same clear API so remounts do not reload stale history.

## Guided lessons (`lesson.yaml`)

Every lab under `scenarios/NN-slug/` ships `lesson.yaml`. Teaching metadata only:

- Steps point at registry actions (`setup`, `services`, or a step id from `apps/control-plane/src/registry/scenarios.ts`)
- Commands stay in the TypeScript registry; README.md remains the CLI source of truth
- Verify rules: `exit-zero`, `service-listening`, `capture-count`
- Optional quick-reference fields (shown in the lab storyboard when set):
  - `caseStudy` - one or two sentences tying the lab to a named real-world supply chain incident
  - `mitigation` - short bullets distilled from that lab's `DETECT.md` (not a second runbook)
  - `incidents` - short name tags (already required-style list on every lab)
- Optional learner-experience fields:
  - `drill` - blind "spot the attack" review (`prompt`, `artifactType` = diff | package-page | ci-log, `artifact` as a list of lines, `choices`, `answer` index, `reveal`, `explanation`)
  - `quiz` - blue-team gate, a list of `{ question, choices, answer, explain }` drawn from the lab's DETECT.md
  - `reversal` - `{ blockedPackage }` the learner's `dependency-guard.json` must block; the control plane re-runs the attack with `scenarios/_shared/dependency-guard.js` preloaded
- Validate with `node scripts/docs/check-lesson-yaml.js` (smoke CI)

Lab **01** is the seed template for `caseStudy` / `mitigation`. Other labs can adopt the same fields later without schema changes.

## Campaigns (`campaigns/*.yaml`)

A campaign chains existing labs into one continuous intrusion under a persistent attacker persona. It never changes how labs run - it only orders them and adds narrative. Progress derives from the same per-scenario state the storyboard writes, so finishing a lab advances the campaign map at `/campaign`.

Each campaign YAML: `id`, `title`, `persona`, `tagline`, `description`, `debrief`, and a `chapters` list of `{ scenario, beat, narrative }` where `scenario` is a two-digit lab id. Two ship today: `operation-quiet-carrier` (01 -> 05 -> 25 -> 11) and `operation-cold-key` (06 -> 14 -> 17 -> 21).

## App boundaries (current merge state)

| Piece | Role |
|-------|------|
| Dashboard (Next.js :3100) | Primary learner UI (welcome, labs, observe, skills, briefing, classroom) |
| Control plane (Express :3101) | Process supervisor, lessons, progress, classroom, assistant, ES proxy |
| Public site | https://simulator.rajanagori.in/ (marketing / docs hub; not part of `./run.sh`) |

Full process merge (Next API routes spawning labs) is intentionally not done - the supervisor stays in the control plane for safety and WebSocket log streaming.

## Project layout

```
apps/
├── design-tokens/    # Shared SCAS brand tokens (Realtime Colors palette)
├── landing/          # Optional local Vite packaging (not started by default)
├── dashboard/        # Next.js learning platform UI
└── control-plane/    # Express + WS + registry + lesson/classroom/skills APIs
```
