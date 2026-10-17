# Module Instance: Scenario 06 (Shai-Hulud)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

I teach this as an incident, not as a trick with `eval`. The interesting part is one install turning into four publishes.

## 1) Module Card

- **Module ID**: `06`
- **Title**: `Shai-Hulud token-theft and re-publishing worm`
- **Level**: `Advanced`
- **Estimated Time**: `50-90 minutes` (the lesson file says 50; a live class with the fan-out debrief runs longer)
- **Primary Attack Surface**: `postinstall` plus a publish token that can reach `@victim-org/*`
- **Prerequisites**: Labs 01-05. Learners should already know what a lifecycle script is.

## 2) Learning Objectives

- Explain why a stolen npm token is the worm, and the script is just the courier.
- Reproduce the fan-out: one `npm install`, four mock publishes, four backdoor PRs.
- Correlate harvest, publish, and PR logs from a single install process.
- Say what you freeze first when the publish token lived on a laptop.

## 3) Threat Model Snapshot

- **Asset at risk**: npm publish tokens, GitHub tokens, and the `@victim-org/*` packages those tokens can write
- **Trust edge abused**: `postinstall` runs as the developer, so it can read `~/.npmrc` and `~/.git-credentials`
- **Attacker objective**: republish poisoned versions and open a backdoor PR on each maintainer repo
- **Blast radius**: every package in `package-lock.json` under `@victim-org/` (utils, api, logger, auth in this lab)

## 4) Lab Setup

```bash
cd scenarios/06-sha-hulud
export TESTBENCH_MODE=enabled
./setup.sh
```

Start `infrastructure/credential-harvester.js` (`:3001`), `github-actions-simulator.js` (`:3002`), and `mock-registry.js` (`:3003`) before `npm install` in `victim-app/`.

## 5) Attack Walkthrough

1. Read `malicious-packages/shai-hulud/postinstall.js` and `victim-app/package-lock.json` before installing. The lockfile is the target list.
2. `cd victim-app && npm install` with `TESTBENCH_MODE=enabled`.
3. Confirm order: `token_harvest` on `:3001/captured-credentials`, then `malicious_publish` on `:3003/published-packages`, then `backdoor_pr` on `:3002/backdoor-prs`.
4. Run `node detection-tools/worm-status.js victim-app` and check that the publish count matches the four `@victim-org` packages.

## 6) Detection Playbook

- **Static checks**: `postinstall` in `shai-hulud`, reads of `.npmrc` and `.git-credentials`, hardcoded `127.0.0.1:3001`, `:3002`, `:3003`.
- **Behavioral checks**: one `npm install` process that harvests, then emits a publish and a PR per lockfile target.
- **Evidence artifacts**: `infrastructure/captured-credentials.json`, `published-packages.json`, `backdoor-prs.json`. Runbook: `scenarios/06-sha-hulud/DETECT.md`.

## 7) Mitigation Playbook

- Keep publish tokens in CI secrets. A laptop that cannot publish cannot feed this worm.
- Default to `npm ci --ignore-scripts` and allowlist the few lifecycle scripts you actually need.
- Require 2FA and provenance on the maintainer account, and keep GitHub tokens short.
- Full bullets live in the scenario README and in `scripts/lib/mitigation-playbooks.js` under `06`.

## 8) Validation Checklist (Success Criteria)

- [ ] Harvest shows up on `:3001` before any publish.
- [ ] Registry log has `@victim-org/victim-utils`, `victim-api`, `victim-logger`, and `victim-auth`.
- [ ] PR log has one backdoor PR per those repos.
- [ ] Learner can point at the lockfile line that made each package a target.

## 9) Production Policy Snippet

```ini
# .npmrc
ignore-scripts=true
```

```yaml
# publish from CI only
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}
```

## 10) Debrief Questions

- What did the worm publish, and which file told it those names?
- Why does moving the token off the laptop stop the fan-out even if the `postinstall` still runs?
- Which of the three logs would you page on first at 2am, and why?
