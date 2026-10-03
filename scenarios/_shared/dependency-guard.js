/**
 * Purple-team reversal guard (learner-authored control).
 *
 * Preloaded with `node -r` ahead of the victim app, exactly like
 * testbench-env.js. It reads a blocklist the learner writes at
 * `victim-app/dependency-guard.json` ({"block": ["request-lib", ...]}) and
 * patches Module._load so any require() of a blocked name throws before the
 * package code runs.
 *
 * The point is the loop: the learner writes the control, the lab re-runs the
 * attack against it, and the capture inspector proves whether it held. If the
 * guard blocks the typosquat, the payload never executes and no new capture
 * appears.
 *
 * Safety: this only ever refuses a module from loading. It changes no network
 * behavior and does not weaken TESTBENCH_MODE gating.
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');

function loadBlocklist() {
  const candidates = [
    process.env.SCAS_GUARD_FILE,
    path.join(process.cwd(), 'dependency-guard.json'),
  ].filter(Boolean);
  for (const file of candidates) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (raw && Array.isArray(raw.block)) {
        return new Set(raw.block.filter((x) => typeof x === 'string'));
      }
    } catch {
      /* missing or malformed guard file -> nothing blocked */
    }
  }
  return new Set();
}

const blocked = loadBlocklist();
if (blocked.size > 0) {
  const originalLoad = Module._load;
  Module._load = function (request, ...rest) {
    if (blocked.has(request)) {
      const err = new Error(
        `[dependency-guard] blocked require("${request}") - blocked by learner control`,
      );
      err.code = 'MODULE_BLOCKED_BY_GUARD';
      throw err;
    }
    return originalLoad.call(this, request, ...rest);
  };
  console.log(`[dependency-guard] active - blocking: ${Array.from(blocked).join(', ')}`);
}
