# Command Center (browser labs)

Same 25 labs as the CLI. Different driver. You click storyboard steps in the browser instead of typing `setup.sh` by hand.

Recommended when you are learning, teaching, or demoing. Keep the CLI for CI, scripts, and headless debugging. Attack theory and `DETECT.md` stay identical either way.

## What you get

| Surface | Port | Job |
|---------|------|-----|
| Command Center (Next.js) | `:3100` | Labs, Campaign, Observatory, Skills, Briefing, Classroom |
| Control plane (API) | `:3101` | Process supervisor, WebSocket logs, progress (proxied via `:3100`) |

Marketing / public docs stay on https://simulator.rajanagori.in/ - that site is not started by `./run.sh`.

## Start it

Docker must be running if you want Elasticsearch, Kibana, and Floci with the UI:

```bash
chmod +x run.sh scripts/ui/run-everything.sh
./run.sh
```

Then open `http://127.0.0.1:3100` on the lab host, or `http://<lab-lan-ip>:3100` from another machine on the LAN.

UI only (no ES/Floci):

```bash
./run.sh --core-only
# or
./scripts/ui/start-dashboard.sh
```

Conference / remote host smoke after clone:

```bash
./scripts/ui/conference-demo-up.sh
```

Still set `export TESTBENCH_MODE=enabled` for payloads. The control plane injects that for lab children; your shell should too when you drop into CLI mid-demo.

## First lab in the UI

1. Open **Labs**.
2. Click **01 Typosquatting**.
3. Walk the storyboard (setup → services → install → run → detect). Live output stays in the dock.
4. Open the live inspector after the attack steps. Then read `scenarios/01-typosquatting/DETECT.md` for the blue-team side.

Prefer a concept walkthrough with CLI commands still listed? Use [Scenario 01 zero-to-hero](../scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md) - it has a "Run this lab" box for both drivers.

## Tour (where to click)

| Nav item | What it is |
|----------|------------|
| Welcome | Safety model and product pitch inside the UI |
| Overview | Stack status, resume card, start ES / Kibana / Floci |
| Labs | Guided storyboard for all 25 scenarios (Red / Blue / Purple) |
| Campaign | Lab chains under one actor (`campaigns/*.yaml`) |
| Observatory | Elasticsearch detection timeline when the stack is up |
| Skills | Category matrix + export |
| Briefing | Incident-style report / score (`/report`) |
| Classroom | Join code, seats, shared inject clock, freeze for debrief |
| Reset lab | Teardown + clear progress / captures / ports |

Inside a lab you will also see PR triage, quizzes, purple reversal, and (on lab 01) the Sigma / Semgrep rule challenge when that path is unlocked.

## LAN tips

Services bind on `0.0.0.0`. Browse with the lab host address, not only `localhost`, when you are on another laptop.

You only need `:3100` reachable over the LAN. The UI proxies `/api/cp/*` and `/ws/logs` to the control plane on the server. Kibana / Floci links rewrite to the hostname in your address bar.

If Overview says Stopped while `./run.sh` says UP, restart the control plane and refresh. Details and env parsing live in the maintainer note: [DASHBOARD.md](../platform/DASHBOARD.md).

## When to switch to CLI

- You are wiring this into CI or a script.
- A step failed and you want the raw `setup.sh` / mock-server terminal.
- You are editing `scenarios/NN-*/` and need the README command path.

Quick CLI entry: [QUICK_START.md](./QUICK_START.md). Full catalog: [CATALOG.md](../scenario-guides/CATALOG.md).

## Safety

- Isolated lab host or VM only.
- Exfil targets `127.0.0.1` / localhost.
- Do not expose `:3100` / `:3101` to untrusted networks.

**Related:** [Documentation index](../index.md) · [Full-stack setup](./FULL_STACK_SETUP.md) · [Operations](../platform/OPERATIONS.md) · [Maintainer UI / control-plane notes](../platform/DASHBOARD.md)
