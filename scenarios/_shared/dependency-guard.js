/**
 * Purple-team reversal guard (learner-authored control).
 *
 * Preloaded with `node -r` ahead of the victim app, exactly like
 * testbench-env.js. It reads a policy the learner writes at
 * `victim-app/dependency-guard.json` and hooks Module._load plus the HTTP
 * clients so a refused dependency never gets to run or phone home.
 *
 * Policy keys (all optional, at least one must be set for the guard to arm):
 *
 *   block                   ["request-lib"]  exact package names to refuse.
 *                           Static name list. A renamed attacker walks past it.
 *   allowOnly               ["requests-lib"] allowlist. The app may only require
 *                           these third-party packages directly. Anything else
 *                           is refused no matter what it is called.
 *   denyDependencyEgress    true             behavioral gate. Code that lives in
 *                           a dependency (node_modules, symlinked packages,
 *                           anything outside the app dir) may not open
 *                           http/https/fetch connections.
 *   egressAllow             ["api.example.test"] hosts dependencies may still
 *                           reach while denyDependencyEgress is on.
 *
 * The loop is: the learner writes the control, the lab re-runs the attack
 * against it (and a mutated copy of the attack), and the capture inspector
 * proves whether it held.
 *
 * Log markers the control plane greps:
 *   [dependency-guard] blocked require("x") reason=blocklist|allowlist
 *   [dependency-guard] blocked egress host=h reason=dependency-egress
 *
 * Safety: this only ever refuses a module load or an outbound request. It
 * never opens a connection, never widens what a payload may do, and does not
 * touch TESTBENCH_MODE gating.
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');

const SHARED_DIR = __dirname;
const APP_DIR = process.cwd();

function strings(value) {
  return Array.isArray(value) ? value.filter((x) => typeof x === 'string' && x.trim()) : [];
}

function loadPolicy() {
  const candidates = [
    process.env.SCAS_GUARD_FILE,
    path.join(process.cwd(), 'dependency-guard.json'),
  ].filter(Boolean);
  for (const file of candidates) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!raw || typeof raw !== 'object') continue;
      const allow = strings(raw.allowOnly);
      return {
        block: new Set(strings(raw.block)),
        allowOnly: allow.length ? new Set(allow) : null,
        denyEgress: raw.denyDependencyEgress === true,
        egressAllow: new Set(strings(raw.egressAllow).map((h) => h.toLowerCase())),
      };
    } catch {
      /* missing or malformed guard file -> try the next candidate */
    }
  }
  return null;
}

/** "pkg/sub/file" -> "pkg", "@scope/pkg/x" -> "@scope/pkg". */
function packageRoot(request) {
  const parts = request.split('/');
  return request.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isBareThirdParty(request) {
  if (typeof request !== 'string' || !request) return false;
  if (request.startsWith('.') || request.startsWith('node:') || request.startsWith('file:')) return false;
  if (path.isAbsolute(request)) return false;
  if (Module.builtinModules.includes(request) || Module.builtinModules.includes(packageRoot(request))) {
    return false;
  }
  return true;
}

function normalizeFile(file) {
  if (typeof file !== 'string') return '';
  return file.startsWith('file://') ? decodeURIComponent(file.slice('file://'.length)) : file;
}

function isAppFile(file) {
  return (
    file.startsWith(APP_DIR + path.sep) && !file.includes(`${path.sep}node_modules${path.sep}`)
  );
}

/** Dependency code = an absolute path that is neither the app's own source nor this guard. */
function isDependencyFile(rawFile) {
  const file = normalizeFile(rawFile);
  if (!file || !path.isAbsolute(file)) return false;
  if (file.startsWith(SHARED_DIR + path.sep)) return false;
  return !isAppFile(file);
}

function stackHasDependencyFrame() {
  const prev = Error.stackTraceLimit;
  Error.stackTraceLimit = 60;
  const stack = new Error().stack || '';
  Error.stackTraceLimit = prev;
  for (const line of stack.split('\n').slice(1)) {
    const m = line.match(/\(?((?:file:\/\/)?\/[^():]+):\d+:\d+\)?\s*$/);
    if (m && isDependencyFile(m[1])) return true;
  }
  return false;
}

function hostFromArgs(args) {
  const first = args[0];
  try {
    if (typeof first === 'string') return new URL(first).hostname.toLowerCase();
    if (first instanceof URL) return first.hostname.toLowerCase();
    if (first && typeof first.url === 'string') return new URL(first.url).hostname.toLowerCase();
  } catch {
    /* fall through to the options object */
  }
  const opts = first && typeof first === 'object' ? first : args[1] && typeof args[1] === 'object' ? args[1] : {};
  const host = opts.hostname || String(opts.host || 'localhost').split(':')[0];
  return String(host).toLowerCase();
}

const policy = loadPolicy();
const armed =
  policy && (policy.block.size > 0 || policy.allowOnly || policy.denyEgress);

if (!armed) {
  console.error(
    `[dependency-guard] no usable policy. Expected ${process.env.SCAS_GUARD_FILE || 'dependency-guard.json'} (cwd ${process.cwd()}) with block, allowOnly or denyDependencyEgress.`,
  );
} else {
  const originalLoad = Module._load;
  Module._load = function (request, parent, ...rest) {
    if (isBareThirdParty(request)) {
      const root = packageRoot(request);
      if (policy.block.has(request) || policy.block.has(root)) {
        console.error(`[dependency-guard] blocked require("${request}") reason=blocklist`);
        const err = new Error(
          `[dependency-guard] blocked require("${request}") - blocked by learner control`,
        );
        err.code = 'MODULE_BLOCKED_BY_GUARD';
        throw err;
      }
      // The allowlist only judges what the app itself pulls in. A permitted
      // package may still load its own dependencies.
      const parentFile = normalizeFile(parent && parent.filename);
      if (policy.allowOnly && parentFile && isAppFile(parentFile) && !policy.allowOnly.has(root)) {
        console.error(`[dependency-guard] blocked require("${request}") reason=allowlist`);
        const err = new Error(
          `[dependency-guard] blocked require("${request}") - not on the allowOnly list`,
        );
        err.code = 'MODULE_BLOCKED_BY_GUARD';
        throw err;
      }
    }
    return originalLoad.call(this, request, parent, ...rest);
  };

  if (policy.denyEgress) {
    const check = (host) => {
      if (policy.egressAllow.has(host)) return;
      if (!stackHasDependencyFrame()) return;
      console.error(`[dependency-guard] blocked egress host=${host} reason=dependency-egress`);
      const err = new Error(
        `[dependency-guard] blocked egress to ${host} - dependency code may not open connections`,
      );
      err.code = 'EGRESS_BLOCKED_BY_GUARD';
      throw err;
    };
    for (const mod of [require('http'), require('https')]) {
      for (const fn of ['request', 'get']) {
        const original = mod[fn];
        mod[fn] = function (...args) {
          check(hostFromArgs(args));
          return original.apply(this, args);
        };
      }
    }
    if (typeof globalThis.fetch === 'function') {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = function (...args) {
        try {
          check(hostFromArgs(args));
        } catch (err) {
          return Promise.reject(err);
        }
        return originalFetch.apply(this, args);
      };
    }
  }

  const gates = [
    policy.block.size ? `block=[${Array.from(policy.block).join(', ')}]` : null,
    policy.allowOnly ? `allowOnly=[${Array.from(policy.allowOnly).join(', ')}]` : null,
    policy.denyEgress ? 'denyDependencyEgress' : null,
  ].filter(Boolean);
  console.log(`[dependency-guard] active - ${gates.join(' ')}`);
}
