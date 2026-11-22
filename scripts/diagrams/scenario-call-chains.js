/**
 * Function call chain for each lab's code-level workflow.
 * Labels are real functions. An arrow means that function calls the next one.
 * Needles are substrings the generator must find in the cited file.
 */
'use strict';

function step(id, lane, col, type, label, sublabel, file, needle, about) {
  return { id, lane, col, type, label, sublabel, file, needle, about };
}

function edge(from, to, extra) {
  return Object.assign({ from, to }, extra || {});
}

const CALLS = 'calls';
const STOP = { variant: 'dashed', role: 'error' };
const GO = { variant: 'security' };

const CHAINS = {
  '01': {
    blurb: 'require calls exfiltrateData, then fetchData calls RequestLib.get.',
    lanes: [
      { id: 'app', label: 'victim index.js' },
      { id: 'pkg', label: 'request-lib' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early return', variant: 'exception' },
    ],
    nodes: [
      step('req', 'app', 0, 'frontend', 'require', 'loads request-lib', 'scenarios/01-typosquatting/victim-app/index.js', "require('request-lib')", 'Loads the typo package'),
      step('exfil', 'pkg', 1, 'security', 'exfiltrateData', 'reads env, may POST', 'scenarios/01-typosquatting/malicious-packages/request-lib/index.js', 'function exfiltrateData', 'Module load calls this'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST /collect :3000', 'scenarios/01-typosquatting/malicious-packages/request-lib/index.js', 'http.request', 'Sends the env payload'),
      step('ret', 'stop', 2, 'external', 'return', 'skips the request', 'scenarios/01-typosquatting/malicious-packages/request-lib/index.js', 'Malicious behavior prevented', 'TESTBENCH_MODE is off'),
      step('fetch', 'app', 3, 'frontend', 'fetchData', 'calls RequestLib.get', 'scenarios/01-typosquatting/victim-app/index.js', 'function fetchData', 'Cover call after require'),
      step('get', 'pkg', 4, 'frontend', 'get', 'cover HTTP GET', 'scenarios/01-typosquatting/malicious-packages/request-lib/index.js', 'static async get', 'Looks like a normal client'),
    ],
    edges: [
      edge('req', 'exfil', { label: CALLS }),
      edge('exfil', 'http', GO),
      edge('exfil', 'ret', STOP),
      edge('req', 'fetch', { label: 'then' }),
      edge('fetch', 'get', { label: CALLS }),
    ],
    mainPath: ['req', 'exfil', 'http'],
    notes: [
      '`victim-app/index.js` calls `require(\'request-lib\')`. That module calls `exfiltrateData`.',
      '`exfiltrateData` reads a few env fields and calls `http.request` (`POST /collect` on port 3000) only when `TESTBENCH_MODE === \'enabled\'`. Otherwise it returns.',
      '`fetchData` then calls `RequestLib.get`, which calls `_makeRequest`. That is the cover request the app prints.',
    ],
  },
  '02': {
    blurb: 'startApplication calls AuthLib.init, which calls exfiltrateConfig. postinstall also POSTs.',
    lanes: [
      { id: 'app', label: 'corporate-app' },
      { id: 'api', label: 'auth-lib' },
      { id: 'hook', label: 'postinstall.js' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('start', 'app', 0, 'frontend', 'startApplication', 'calls AuthLib.init', 'scenarios/02-dependency-confusion/corporate-app/index.js', 'async function startApplication', 'App entry'),
      step('init', 'api', 1, 'security', 'AuthLib.init', 'calls exfiltrateConfig', 'scenarios/02-dependency-confusion/attacker-packages/@techcorp/auth-lib/index.js', 'static init', 'Init runs the payload first'),
      step('exfil', 'api', 2, 'security', 'exfiltrateConfig', 'sends the config', 'scenarios/02-dependency-confusion/attacker-packages/@techcorp/auth-lib/index.js', 'function exfiltrateConfig', 'Captures the init config'),
      step('http', 'net', 3, 'backend', 'http.request', 'POST /collect', 'scenarios/02-dependency-confusion/attacker-packages/@techcorp/auth-lib/index.js', 'http.request', 'Config leaves on localhost'),
      step('post', 'hook', 0, 'security', 'postinstall', 'npm runs this script', 'scenarios/02-dependency-confusion/attacker-packages/@techcorp/auth-lib/postinstall.js', "TESTBENCH_MODE === 'enabled'", 'Install-time script'),
      step('hookhttp', 'net', 1, 'backend', 'http.request', 'POST install beacon', 'scenarios/02-dependency-confusion/attacker-packages/@techcorp/auth-lib/postinstall.js', 'http.request', 'Separate from init'),
    ],
    edges: [
      edge('start', 'init', { label: CALLS }),
      edge('init', 'exfil', { label: CALLS }),
      edge('exfil', 'http', GO),
      edge('post', 'hookhttp', { label: CALLS }),
    ],
    mainPath: ['start', 'init', 'exfil', 'http'],
    notes: [
      '`startApplication` calls `AuthLib.init`.',
      '`AuthLib.init` calls `exfiltrateConfig`, which calls `http.request` with the config. That POST stays on localhost, and only when `TESTBENCH_MODE === \'enabled\'`.',
      '`postinstall` is a second caller. npm runs it at install and it calls its own `http.request`. `init` does not call `postinstall`.',
    ],
  },
  '03': {
    blurb: 'Module load and validatePassword both call _reportMetrics.',
    lanes: [
      { id: 'load', label: 'module load' },
      { id: 'methods', label: 'SecureValidator' },
      { id: 'api', label: '_reportMetrics' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('iife', 'load', 0, 'security', 'module load', 'calls _reportMetrics', 'scenarios/03-compromised-package/compromised-package/secure-validator/index.js', "function()", 'IIFE on require'),
      step('pass', 'methods', 0, 'frontend', 'validatePassword', 'calls _reportMetrics', 'scenarios/03-compromised-package/compromised-package/secure-validator/index.js', 'static validatePassword', 'Passes the password in'),
      step('report', 'api', 1, 'security', '_reportMetrics', 'packs the fields', 'scenarios/03-compromised-package/compromised-package/secure-validator/index.js', 'function _reportMetrics', 'Looks like telemetry'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST /collect', 'scenarios/03-compromised-package/compromised-package/secure-validator/index.js', 'http.request', 'Sends capturedData'),
    ],
    edges: [
      edge('iife', 'report', { label: CALLS }),
      edge('pass', 'report', { label: CALLS }),
      edge('report', 'http', GO),
    ],
    mainPath: ['iife', 'report', 'http'],
    notes: [
      'Requiring `secure-validator` runs an IIFE that calls `_reportMetrics(\'module_load\', ...)`.',
      '`validatePassword` also calls `_reportMetrics(\'password\', password)` before the strength check. `validateEmail` and `validate` do the same with their own arguments.',
      '`_reportMetrics` returns immediately when `TESTBENCH_MODE` is off. When it is on, it calls `http.request` to localhost.',
    ],
  },
  '04': {
    blurb: 'Loading utils-helper calls exfiltrateData.',
    lanes: [
      { id: 'pkg', label: 'utils-helper' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early return', variant: 'exception' },
    ],
    nodes: [
      step('load', 'pkg', 0, 'security', 'module load', 'calls exfiltrateData', 'scenarios/04-malicious-update/malicious-update/utils-helper/index.js', 'exfiltrateData();', 'Runs on require of 2.1.1'),
      step('exfil', 'pkg', 1, 'security', 'exfiltrateData', 'reads update env', 'scenarios/04-malicious-update/malicious-update/utils-helper/index.js', 'function exfiltrateData', 'Payload in the new version'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST /collect', 'scenarios/04-malicious-update/malicious-update/utils-helper/index.js', 'http.request', 'Sends the update payload'),
      step('ret', 'stop', 2, 'external', 'return', 'skips the POST', 'scenarios/04-malicious-update/malicious-update/utils-helper/index.js', 'function exfiltrateData', 'TESTBENCH_MODE is off'),
    ],
    edges: [
      edge('load', 'exfil', { label: CALLS }),
      edge('exfil', 'http', GO),
      edge('exfil', 'ret', STOP),
    ],
    mainPath: ['load', 'exfil', 'http'],
    notes: [
      'Requiring `utils-helper` after the malicious update calls `exfiltrateData()`.',
      '`exfiltrateData` returns when `TESTBENCH_MODE` is off. When it is on, it calls `http.request` (`POST /collect` on localhost) with the update version and a few env fields.',
    ],
  },
  '05': {
    blurb: 'local-ci.js loads build-action, and that module calls run.',
    lanes: [
      { id: 'ci', label: 'local-ci.js' },
      { id: 'action', label: 'build-action' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early return', variant: 'exception' },
    ],
    nodes: [
      step('req', 'ci', 0, 'frontend', 'require', 'loads build-action', 'scenarios/05-build-compromise/victim-app/local-ci.js', "require('../malicious-action/index.js')", 'Step 4 of the fake CI'),
      step('run', 'action', 1, 'security', 'run', 'reads dist/app.js', 'scenarios/05-build-compromise/malicious-action/index.js', 'function run()', 'Module load calls run'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST CI secrets', 'scenarios/05-build-compromise/malicious-action/index.js', 'http.request', 'Sends the artifact text'),
      step('ret', 'stop', 2, 'external', 'return', 'publish line only', 'scenarios/05-build-compromise/malicious-action/index.js', 'Publishing artifact', 'TESTBENCH_MODE is off'),
    ],
    edges: [
      edge('req', 'run', { label: CALLS }),
      edge('run', 'http', GO),
      edge('run', 'ret', STOP),
    ],
    mainPath: ['req', 'run', 'http'],
    notes: [
      '`local-ci.js` calls `require(\'../malicious-action/index.js\')` in the step that looks like `vendor/build-action@v1`.',
      'That file calls `run()`. `run` reads `dist/app.js` and calls `http.request` only when `TESTBENCH_MODE === \'enabled\'`. Otherwise it prints the publish line and returns.',
    ],
  },
  '06': {
    blurb: 'postinstall calls run, and run calls the harvest, lockfile, publish, and spread functions.',
    lanes: [
      { id: 'script', label: 'postinstall.js' },
      { id: 'files', label: 'token files' },
      { id: 'lock', label: 'lockfile' },
      { id: 'net', label: 'localhost' },
      { id: 'spread', label: 'spread math' },
    ],
    nodes: [
      step('run', 'script', 0, 'security', 'run', 'postinstall calls run', 'scenarios/06-sha-hulud/malicious-packages/shai-hulud/postinstall.js', 'function run()', 'Entry after the gate'),
      step('read', 'files', 1, 'backend', 'readFileSafe', 'reads .npmrc', 'scenarios/06-sha-hulud/malicious-packages/shai-hulud/postinstall.js', 'function readFileSafe', 'run calls this for tokens'),
      step('disc', 'lock', 1, 'security', 'discoverTargetPackages', 'parses the lockfile', 'scenarios/06-sha-hulud/malicious-packages/shai-hulud/postinstall.js', 'function discoverTargetPackages', 'run calls this next'),
      step('post', 'net', 1, 'backend', 'postJson', 'POST harvest and publish', 'scenarios/06-sha-hulud/malicious-packages/shai-hulud/postinstall.js', 'function postJson', 'http.request inside'),
      step('sim', 'spread', 1, 'frontend', 'simulateTemporalSpread', 'counts infections', 'scenarios/06-sha-hulud/malicious-packages/shai-hulud/postinstall.js', 'function simulateTemporalSpread', 'run calls this last'),
    ],
    edges: [
      edge('run', 'read', { label: CALLS }),
      edge('run', 'disc', { label: CALLS }),
      edge('run', 'post', { label: CALLS }),
      edge('run', 'sim', { label: CALLS }),
    ],
    mainPath: ['run', 'post'],
    notes: [
      'The postinstall script calls `run()`. `run` returns immediately when `TESTBENCH_MODE` is off.',
      '`run` calls `readFileSafe` on `.npmrc`, then `postJson` with the harvest, then `discoverTargetPackages` on the lockfile.',
      'For each discovered package, `run` calls `postJson` again (registry and the GitHub sim). It then calls `simulateTemporalSpread`. `infectPackage` is defined in this file and is not called.',
    ],
  },
  '07': {
    blurb: 'runApplication calls processUsers, which calls groupBy. postinstall calls http.request on its own.',
    lanes: [
      { id: 'app', label: 'victim index.js' },
      { id: 'utils', label: 'web-utils' },
      { id: 'dep', label: 'data-processor' },
      { id: 'hook', label: 'postinstall.js' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('run', 'app', 0, 'frontend', 'runApplication', 'calls processUsers', 'scenarios/07-transitive-dependency/victim-app/index.js', 'async function runApplication', 'App entry'),
      step('proc', 'utils', 1, 'frontend', 'processUsers', 'calls groupBy', 'scenarios/07-transitive-dependency/legitimate-packages/web-utils/index.js', 'static processUsers', 'The direct dependency'),
      step('group', 'dep', 2, 'frontend', 'groupBy', 'groups the array', 'scenarios/07-transitive-dependency/compromised-packages/data-processor/index.js', 'static groupBy', 'Cover method, no network'),
      step('post', 'hook', 0, 'security', 'postinstall', 'npm runs this script', 'scenarios/07-transitive-dependency/compromised-packages/data-processor/postinstall.js', "TESTBENCH_MODE === 'enabled'", 'Transitive install hook'),
      step('http', 'net', 1, 'backend', 'http.request', 'POST install data', 'scenarios/07-transitive-dependency/compromised-packages/data-processor/postinstall.js', 'http.request', 'Not called by groupBy'),
    ],
    edges: [
      edge('run', 'proc', { label: CALLS }),
      edge('proc', 'group', { label: CALLS }),
      edge('post', 'http', { label: CALLS }),
    ],
    mainPath: ['post', 'http'],
    notes: [
      '`runApplication` calls `WebUtils.processUsers`, which calls `DataProcessor.groupBy`. Those methods only reshape the array.',
      'The network call is `postinstall` in `data-processor`. npm runs it because `web-utils` depends on `data-processor`. The script calls `http.request` when `TESTBENCH_MODE === \'enabled\'`.',
      '`groupBy` does not call `postinstall`.',
    ],
  },
  '08': {
    blurb: 'manipulateLockFile calls injectLockfileV3. evil-utils postinstall calls http.request.',
    lanes: [
      { id: 'tool', label: 'manipulate-lock-file.js' },
      { id: 'hook', label: 'evil-utils' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('man', 'tool', 0, 'security', 'manipulateLockFile', 'picks the lock format', 'scenarios/08-package-lock-file-manipulation/templates/manipulate-lock-file.js', 'function manipulateLockFile', 'Rewrites the lockfile'),
      step('v3', 'tool', 1, 'security', 'injectLockfileV3', 'writes the bad entry', 'scenarios/08-package-lock-file-manipulation/templates/manipulate-lock-file.js', 'function injectLockfileV3', 'Called for lockfile v3'),
      step('post', 'hook', 2, 'security', 'postinstall', 'npm runs evil-utils', 'scenarios/08-package-lock-file-manipulation/malicious-packages/evil-utils/postinstall.js', "TESTBENCH_MODE === 'enabled'", 'Runs after the bad install'),
      step('http', 'net', 3, 'backend', 'http.request', 'POST lockfile fields', 'scenarios/08-package-lock-file-manipulation/malicious-packages/evil-utils/postinstall.js', 'http.request', 'Install script, not the tool'),
    ],
    edges: [
      edge('man', 'v3', { label: CALLS }),
      edge('post', 'http', { label: CALLS }),
    ],
    mainPath: ['man', 'v3'],
    notes: [
      '`manipulateLockFile` calls `injectLockfileV3` for a v3 lockfile, or `injectLegacyDependencies` for the older shape. That writes the `evil-utils` entry.',
      'npm install then runs `evil-utils/postinstall.js`. That script calls `http.request` when `TESTBENCH_MODE === \'enabled\'`. The lockfile tool does not call `postinstall`.',
    ],
  },
  '09': {
    blurb: 'secure-utils postinstall calls http.request. Signature checks are not a function in this package.',
    lanes: [
      { id: 'hook', label: 'secure-utils' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('post', 'hook', 0, 'security', 'postinstall', 'signed package script', 'scenarios/09-package-signing-bypass/compromised-package/secure-utils/postinstall.js', "TESTBENCH_MODE === 'enabled'", 'npm runs this on install'),
      step('http', 'net', 1, 'backend', 'http.request', 'POST /collect', 'scenarios/09-package-signing-bypass/compromised-package/secure-utils/postinstall.js', 'http.request', 'Localhost only'),
    ],
    edges: [edge('post', 'http', { label: CALLS })],
    mainPath: ['post', 'http'],
    notes: [
      'This package has no named runtime function. npm calls the `postinstall` script.',
      'The script calls `http.request` only when `TESTBENCH_MODE === \'enabled\'`. The file header says the package is signed with the legitimate key, so a signature check would still pass. There is no verify function in this package.',
    ],
  },
  '10': {
    blurb: 'postinstall.sh calls curl.',
    lanes: [
      { id: 'script', label: 'postinstall.sh' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('post', 'script', 0, 'security', 'postinstall', 'collects host fields', 'scenarios/10-git-submodule-attack/malicious-submodule/postinstall.sh', 'TESTBENCH_MODE', 'Bash hook, no functions'),
      step('curl', 'net', 1, 'backend', 'curl', 'POST /collect', 'scenarios/10-git-submodule-attack/malicious-submodule/postinstall.sh', 'curl -s -X POST', 'localhost:3000'),
    ],
    edges: [edge('post', 'curl', { label: CALLS })],
    mainPath: ['post', 'curl'],
    notes: [
      'The submodule hook is `postinstall.sh`. It has no functions.',
      'When `TESTBENCH_MODE` is `enabled`, the script builds a JSON body and calls `curl` to `POST /collect` on localhost. Otherwise it does nothing.',
    ],
  },
  '11': {
    blurb: 'enterprise-utils postinstall calls http.request.',
    lanes: [
      { id: 'hook', label: 'enterprise-utils' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('post', 'hook', 0, 'security', 'postinstall', 'mirror install script', 'scenarios/11-registry-mirror-poisoning/compromised-mirror/enterprise-utils/postinstall.js', "TESTBENCH_MODE === 'enabled'", 'Runs from the bad mirror'),
      step('http', 'net', 1, 'backend', 'http.request', 'POST /collect', 'scenarios/11-registry-mirror-poisoning/compromised-mirror/enterprise-utils/postinstall.js', 'http.request', 'Localhost only'),
    ],
    edges: [edge('post', 'http', { label: CALLS })],
    mainPath: ['post', 'http'],
    notes: [
      'The poisoned mirror package `enterprise-utils` has no named function. npm calls `postinstall`.',
      'That script calls `http.request` when `TESTBENCH_MODE === \'enabled\'`. `secure-lib/postinstall.js` in the same mirror is a second, smaller script and is not called by this one.',
    ],
  },
  '12': {
    blurb: 'main calls postCapture, which calls http.request.',
    lanes: [
      { id: 'script', label: 'utils postinstall' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early return', variant: 'exception' },
    ],
    nodes: [
      step('main', 'script', 0, 'security', 'main', 'reads workspace files', 'scenarios/12-workspace-monorepo-attack/packages/utils/postinstall.js', 'async function main', 'postinstall calls main'),
      step('cap', 'script', 1, 'security', 'postCapture', 'POSTs the payload', 'scenarios/12-workspace-monorepo-attack/packages/utils/postinstall.js', 'function postCapture', 'main awaits this'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST /collect :3000', 'scenarios/12-workspace-monorepo-attack/packages/utils/postinstall.js', 'http.request', 'Inside postCapture'),
      step('ret', 'stop', 1, 'external', 'return', 'skips postCapture', 'scenarios/12-workspace-monorepo-attack/packages/utils/postinstall.js', "TESTBENCH_MODE !== 'enabled'", 'main returns first'),
    ],
    edges: [
      edge('main', 'cap', { label: CALLS }),
      edge('cap', 'http', GO),
      edge('main', 'ret', STOP),
    ],
    mainPath: ['main', 'cap', 'http'],
    notes: [
      'The workspace package postinstall calls `main()`.',
      '`main` returns when `TESTBENCH_MODE` is off. When it is on, it reads a few workspace files and calls `postCapture`.',
      '`postCapture` calls `http.request` to `127.0.0.1:3000/collect`.',
    ],
  },
  '13': {
    blurb: 'require calls postCapture. The install script calls http.request on its own.',
    lanes: [
      { id: 'hook', label: 'postinstall.js' },
      { id: 'mod', label: 'clean-utils' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('post', 'hook', 0, 'security', 'postinstall', 'install script POSTs', 'scenarios/13-package-metadata-manipulation/compromised-packages/clean-utils/postinstall.js', 'http.request', 'No named function'),
      step('hookhttp', 'net', 1, 'backend', 'http.request', 'POST /capture', 'scenarios/13-package-metadata-manipulation/compromised-packages/clean-utils/postinstall.js', 'path: \'/capture\'', 'Install-time request'),
      step('cap', 'mod', 2, 'security', 'postCapture', 'require calls this', 'scenarios/13-package-metadata-manipulation/compromised-packages/clean-utils/index.js', 'function postCapture', 'Fired at the bottom of the file'),
      step('http', 'net', 3, 'backend', 'http.request', 'POST /capture :3001', 'scenarios/13-package-metadata-manipulation/compromised-packages/clean-utils/index.js', 'http.request', 'Inside postCapture'),
    ],
    edges: [
      edge('post', 'hookhttp', { label: CALLS }),
      edge('cap', 'http', { label: CALLS }),
    ],
    mainPath: ['cap', 'http'],
    notes: [
      '`clean-utils/index.js` calls `postCapture(\'metadata-manipulation-sim-load\')` as soon as it is required. `postCapture` returns when `TESTBENCH_MODE` is off, and otherwise calls `http.request` to port 3001 `/capture`.',
      '`postinstall.js` is a separate script. It calls `http.request` to the same path during install. `postCapture` does not call that script.',
    ],
  },
  '14': {
    blurb: 'malicious-start calls http.request, and the response calls finish.',
    lanes: [
      { id: 'start', label: 'malicious-start.js' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early exit', variant: 'exception' },
    ],
    nodes: [
      step('entry', 'start', 0, 'security', 'malicious-start', 'container entrypoint', 'scenarios/14-container-image-supply-chain-attack/images/compromised-image/malicious-start.js', 'TESTBENCH_MODE', 'Top of the start script'),
      step('exit', 'stop', 1, 'external', 'process.exit', 'benign exit', 'scenarios/14-container-image-supply-chain-attack/images/compromised-image/malicious-start.js', 'process.exit(0)', 'TESTBENCH_MODE is off'),
      step('http', 'net', 1, 'backend', 'http.request', 'POST /capture', 'scenarios/14-container-image-supply-chain-attack/images/compromised-image/malicious-start.js', 'http.request', 'Beacon to the mock'),
      step('fin', 'start', 2, 'backend', 'finish', 'upload, then exit', 'scenarios/14-container-image-supply-chain-attack/images/compromised-image/malicious-start.js', 'function finish', 'Response callback calls this'),
    ],
    edges: [
      edge('entry', 'exit', STOP),
      edge('entry', 'http', GO),
      edge('http', 'fin', { label: CALLS }),
    ],
    mainPath: ['entry', 'http', 'fin'],
    notes: [
      '`malicious-start.js` calls `process.exit(0)` when `TESTBENCH_MODE` is off.',
      'When it is on, the script calls `http.request` to `/capture`. The response callback, and the error handler, both call `finish`.',
      '`finish` tries the Floci upload and then calls `process.exit`.',
    ],
  },
  '15': {
    blurb: 'The victim calls run. postinstall calls http.request on its own.',
    lanes: [
      { id: 'app', label: 'victim index.js' },
      { id: 'tool', label: 'dev-tool' },
      { id: 'hook', label: 'postinstall.js' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('app', 'app', 0, 'frontend', 'index.js', 'calls devTool.run', 'scenarios/15-developer-tool-compromise/victim-app/index.js', 'devTool.run()', 'After require'),
      step('run', 'tool', 1, 'frontend', 'run', 'returns { ok: true }', 'scenarios/15-developer-tool-compromise/dev-tools/malicious-dev-tool/index.js', 'function run()', 'Does not open the network'),
      step('post', 'hook', 0, 'security', 'postinstall', 'npm runs the tool script', 'scenarios/15-developer-tool-compromise/dev-tools/malicious-dev-tool/postinstall.js', "TESTBENCH_MODE === 'enabled'", 'Install-time payload'),
      step('http', 'net', 1, 'backend', 'http.request', 'POST env fields', 'scenarios/15-developer-tool-compromise/dev-tools/malicious-dev-tool/postinstall.js', 'http.request', 'Not called by run'),
    ],
    edges: [
      edge('app', 'run', { label: CALLS }),
      edge('post', 'http', { label: CALLS }),
    ],
    mainPath: ['post', 'http'],
    notes: [
      '`victim-app/index.js` calls `devTool.run()`. `run` returns `{ ok: true, tool: \'dev-tool\' }` and does not call the network.',
      'The POST is in `postinstall.js`. npm runs that script, and it calls `http.request` when `TESTBENCH_MODE === \'enabled\'`. `run` does not call `postinstall`.',
    ],
  },
  '16': {
    blurb: 'install-from-cache calls copyDir. Loading cache-lib calls http.request.',
    lanes: [
      { id: 'script', label: 'install-from-cache.js' },
      { id: 'mod', label: 'cache-lib' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('script', 'script', 0, 'frontend', 'install-from-cache', 'calls copyDir', 'scenarios/16-package-cache-poisoning/victim-app/scripts/install-from-cache.js', 'copyDir(cacheLibSrc', 'Top of the script'),
      step('copy', 'script', 1, 'frontend', 'copyDir', 'copies cache-lib in', 'scenarios/16-package-cache-poisoning/victim-app/scripts/install-from-cache.js', 'function copyDir', 'Recursive file copy'),
      step('load', 'mod', 2, 'security', 'module load', 'runs the body', 'scenarios/16-package-cache-poisoning/cache/cache-lib/index.js', "TESTBENCH_MODE === 'enabled'", 'require of cache-lib'),
      step('http', 'net', 3, 'backend', 'http.request', 'POST :3016', 'scenarios/16-package-cache-poisoning/cache/cache-lib/index.js', 'http.request', 'Also writes the capture file'),
    ],
    edges: [
      edge('script', 'copy', { label: CALLS }),
      edge('load', 'http', { label: CALLS }),
    ],
    mainPath: ['script', 'copy'],
    notes: [
      '`install-from-cache.js` calls `copyDir`, which copies `cache/cache-lib` into `node_modules`.',
      'The next step is a require of `cache-lib`, not a call from `copyDir`. The module body calls `http.request` to port 3016 when `TESTBENCH_MODE === \'enabled\'`, and it also appends the same payload to `captured-data.json`.',
    ],
  },
  '17': {
    blurb: 'main calls stage1, then stage2Chain. Each stage calls postJson.',
    lanes: [
      { id: 'app', label: 'victim index.js' },
      { id: 's1', label: 'stage1-access-lib' },
      { id: 's2', label: 'stage2-compromised-lib' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('main', 'app', 0, 'frontend', 'main', 'calls both stages', 'scenarios/17-multi-stage-attack-chain/victim-app/index.js', 'async function main', 'App entry'),
      step('stage1', 's1', 1, 'security', 'stage1', 'calls writeToken', 'scenarios/17-multi-stage-attack-chain/packages/stage1-access-lib/index.js', 'async function stage1', 'First stage'),
      step('write', 's1', 2, 'backend', 'writeToken', 'writes token.json', 'scenarios/17-multi-stage-attack-chain/packages/stage1-access-lib/index.js', 'function writeToken', 'stage1 calls this first'),
      step('post1', 'net', 3, 'backend', 'postJson', 'POST stage1 :3017', 'scenarios/17-multi-stage-attack-chain/packages/stage1-access-lib/index.js', 'function postJson', 'stage1 awaits this'),
      step('stage2', 's2', 4, 'security', 'stage2Chain', 'calls readToken', 'scenarios/17-multi-stage-attack-chain/packages/stage2-compromised-lib/index.js', 'async function stage2Chain', 'main calls this second'),
      step('read', 's2', 5, 'backend', 'readToken', 'reads token.json', 'scenarios/17-multi-stage-attack-chain/packages/stage2-compromised-lib/index.js', 'function readToken', 'stage2Chain calls this'),
    ],
    edges: [
      edge('main', 'stage1', { label: CALLS }),
      edge('stage1', 'write', { label: CALLS }),
      edge('stage1', 'post1', { label: CALLS }),
      edge('main', 'stage2', { label: CALLS }),
      edge('stage2', 'read', { label: CALLS }),
    ],
    mainPath: ['main', 'stage1', 'write'],
    notes: [
      '`main` calls `stage1()`, then `stage2Chain()`.',
      '`stage1` calls `writeToken`, then `appendEvidence`, then `postJson` to `127.0.0.1:3017/collect` when `TESTBENCH_MODE === \'enabled\'`.',
      '`stage2Chain` calls `readToken`, then its own `appendEvidence` and `postJson`. It does not call `stage1`.',
    ],
  },
  '18': {
    blurb: 'readPackage adds the dependency. target-lib require loads malicious-logger, which calls http.request.',
    lanes: [
      { id: 'hook', label: '.pnpmfile.cjs' },
      { id: 'lib', label: 'target-lib' },
      { id: 'pkg', label: 'malicious-logger' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('read', 'hook', 0, 'security', 'readPackage', 'adds malicious-logger', 'scenarios/18-package-manager-plugin-attack/victim-app/.pnpmfile.cjs', 'readPackage(pkg)', 'pnpm calls this hook'),
      step('req', 'lib', 1, 'frontend', 'require', 'loads malicious-logger', 'scenarios/18-package-manager-plugin-attack/packages/target-lib/index.js', "require('malicious-logger')", 'Top of target-lib'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST env :3018', 'scenarios/18-package-manager-plugin-attack/packages/malicious-logger/index.js', 'http.request', 'Runs on import'),
      step('log', 'pkg', 3, 'frontend', 'log', 'prints the message', 'scenarios/18-package-manager-plugin-attack/packages/malicious-logger/index.js', 'module.exports', 'Cover export, no network'),
    ],
    edges: [
      edge('req', 'http', { label: CALLS }),
    ],
    mainPath: ['req', 'http'],
    notes: [
      'pnpm calls `readPackage` from `.pnpmfile.cjs`. For `target-lib`, that hook adds `malicious-logger`. It does not call the logger.',
      '`target-lib/index.js` calls `require(\'malicious-logger\')`. The logger module body calls `http.request` to port 3018 when `TESTBENCH_MODE === \'enabled\'`.',
      '`log` is the export. It only prints. The import path does not call `log`.',
    ],
  },
  '19': {
    blurb: 'main calls generateSbom, which calls exfiltrateEvidence.',
    lanes: [
      { id: 'app', label: 'victim index.js' },
      { id: 'sbom', label: 'malicious-sbom-generator' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early return', variant: 'exception' },
    ],
    nodes: [
      step('main', 'app', 0, 'frontend', 'main', 'calls generateSbom', 'scenarios/19-sbom-manipulation-attack/victim-app/index.js', 'async function main', 'App entry'),
      step('gen', 'sbom', 1, 'security', 'generateSbom', 'drops omitted deps', 'scenarios/19-sbom-manipulation-attack/sbom/malicious-sbom-generator.js', 'async function generateSbom', 'Writes the public SBOM'),
      step('exfil', 'sbom', 2, 'security', 'exfiltrateEvidence', 'POSTs the truth', 'scenarios/19-sbom-manipulation-attack/sbom/malicious-sbom-generator.js', 'function exfiltrateEvidence', 'generateSbom awaits this'),
      step('http', 'net', 3, 'backend', 'http.request', 'POST /collect :3019', 'scenarios/19-sbom-manipulation-attack/sbom/malicious-sbom-generator.js', 'http.request', 'Inside exfiltrateEvidence'),
      step('ret', 'stop', 2, 'external', 'return', 'sent: false', 'scenarios/19-sbom-manipulation-attack/sbom/malicious-sbom-generator.js', 'TESTBENCH_MODE not enabled', 'No request'),
    ],
    edges: [
      edge('main', 'gen', { label: CALLS }),
      edge('gen', 'exfil', { label: CALLS }),
      edge('exfil', 'http', GO),
      edge('exfil', 'ret', STOP),
    ],
    mainPath: ['main', 'gen', 'exfil', 'http'],
    notes: [
      '`main` calls `generateSbom` with the truth list and the names to omit.',
      '`generateSbom` filters those names out of the public SBOM, then calls `exfiltrateEvidence` with both lists.',
      '`exfiltrateEvidence` resolves `{ sent: false }` when `TESTBENCH_MODE` is off. When it is on, it calls `http.request` to port 3019.',
    ],
  },
  '20': {
    blurb: 'require calls http.request on load, then index.js calls log.',
    lanes: [
      { id: 'app', label: 'victim index.js' },
      { id: 'pkg', label: 'trusted-logger' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('req', 'app', 0, 'frontend', 'require', 'loads trusted-logger', 'scenarios/20-package-version-confusion/victim-app/index.js', "require('trusted-logger')", 'After the signature checks'),
      step('http', 'net', 1, 'backend', 'http.request', 'POST on load :3020', 'scenarios/20-package-version-confusion/malicious-package/trusted-logger/index.js', 'http.request', 'Module body, not log'),
      step('log', 'pkg', 2, 'frontend', 'log', 'prints one JSON line', 'scenarios/20-package-version-confusion/malicious-package/trusted-logger/index.js', 'function log', 'index.js calls logger.log'),
    ],
    edges: [
      edge('req', 'http', { label: CALLS }),
      edge('req', 'log', { label: 'then' }),
    ],
    mainPath: ['req', 'http'],
    notes: [
      '`victim-app/index.js` calls `require(\'trusted-logger\')` after the provenance checks pass.',
      'The module body calls `http.request` to port 3020 when `TESTBENCH_MODE === \'enabled\'`. That is not inside `log`.',
      'The same index file then calls `logger.log(\'info\', ...)`. `log` only prints a JSON line.',
    ],
  },
  '21': {
    blurb: 'plain-crypto-js-like postinstall calls http.request. axios-like get does not.',
    lanes: [
      { id: 'hook', label: 'plain-crypto-js-like' },
      { id: 'app', label: 'victim index.js' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('post', 'hook', 0, 'security', 'postinstall', 'npm runs the transitive script', 'scenarios/21-axios-compromised-release-attack/packages/plain-crypto-js-like/postinstall.js', "TESTBENCH_MODE !== 'enabled'", 'Not imported by the app'),
      step('http', 'net', 1, 'backend', 'http.request', 'POST /beacon', 'scenarios/21-axios-compromised-release-attack/packages/plain-crypto-js-like/postinstall.js', 'http.request', 'Install-time request'),
      step('req', 'app', 2, 'frontend', 'require', 'loads axios-like', 'scenarios/21-axios-compromised-release-attack/victim-app/index.js', "require('axios-like')", 'Parent package only'),
      step('get', 'app', 3, 'frontend', 'get', 'returns { data: ok }', 'scenarios/21-axios-compromised-release-attack/packages/axios-like-1.14.1/index.js', 'get(url)', 'Cover client, no beacon'),
    ],
    edges: [
      edge('post', 'http', { label: CALLS }),
      edge('req', 'get', { label: CALLS }),
    ],
    mainPath: ['post', 'http'],
    notes: [
      'npm install of `axios-like` runs `plain-crypto-js-like/postinstall.js`. The victim never imports that package. The script calls `http.request` to `/beacon` when `TESTBENCH_MODE === \'enabled\'`.',
      '`victim-app/index.js` calls `require(\'axios-like\')`. `get` resolves `{ data: \'ok\' }` and does not call `postinstall`.',
    ],
  },
  '22': {
    blurb: 'main imports litellm_like, which calls _import_trigger.',
    lanes: [
      { id: 'app', label: 'run_victim.py' },
      { id: 'pkg', label: 'litellm_like' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early return', variant: 'exception' },
    ],
    nodes: [
      step('main', 'app', 0, 'frontend', 'main', 'imports litellm_like', 'scenarios/22-litellm-pypi-compromise/victim-app/run_victim.py', 'def main', 'Victim entry'),
      step('trig', 'pkg', 1, 'security', '_import_trigger', 'writes the marker', 'scenarios/22-litellm-pypi-compromise/python-packages/v1_82_7/litellm_like/__init__.py', 'def _import_trigger', 'Called at import'),
      step('url', 'net', 2, 'backend', 'urlopen', 'POST /collect :3022', 'scenarios/22-litellm-pypi-compromise/python-packages/v1_82_7/litellm_like/__init__.py', 'urllib.request.urlopen', 'Inside _import_trigger'),
      step('ret', 'stop', 2, 'external', 'return', 'skips the POST', 'scenarios/22-litellm-pypi-compromise/python-packages/v1_82_7/litellm_like/__init__.py', 'TESTBENCH_MODE', 'Gate at the top of the function'),
    ],
    edges: [
      edge('main', 'trig', { label: CALLS }),
      edge('trig', 'url', GO),
      edge('trig', 'ret', STOP),
    ],
    mainPath: ['main', 'trig', 'url'],
    notes: [
      '`main` in `run_victim.py` imports `litellm_like`.',
      'The package calls `_import_trigger()` at import. That function returns when `TESTBENCH_MODE` is not `enabled`, or when `TESTBENCH_OFFLINE` is `1`.',
      'Otherwise it writes `.testbench-litellm-import.json` and calls `urllib.request.urlopen` to `127.0.0.1:3022/collect`.',
    ],
  },
  '23': {
    blurb: 'require calls harvestAndExfiltrate. The pipeline then calls scanTarget and printSummary.',
    lanes: [
      { id: 'ci', label: 'run-pipeline.js' },
      { id: 'action', label: 'trivy-action-like' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('req', 'ci', 0, 'frontend', 'require', 'loads trivy-action-like', 'scenarios/23-trivy-supply-chain-attack/victim-ci/run-pipeline.js', "require('trivy-action-like')", 'Step 3 of the fake CI'),
      step('harv', 'action', 1, 'security', 'harvestAndExfiltrate', 'reads CI env', 'scenarios/23-trivy-supply-chain-attack/malicious-trivy/v0.69.4/trivy-action-like.js', 'function harvestAndExfiltrate', 'Module load calls this'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST /collect :3023', 'scenarios/23-trivy-supply-chain-attack/malicious-trivy/v0.69.4/trivy-action-like.js', 'http.request', 'Before the scan'),
      step('scan', 'action', 3, 'frontend', 'scanTarget', 'fake vuln report', 'scenarios/23-trivy-supply-chain-attack/malicious-trivy/v0.69.4/trivy-action-like.js', 'function scanTarget', 'Pipeline calls this later'),
      step('sum', 'action', 4, 'frontend', 'printSummary', 'prints the report', 'scenarios/23-trivy-supply-chain-attack/malicious-trivy/v0.69.4/trivy-action-like.js', 'function printSummary', 'scanTarget does not call this'),
    ],
    edges: [
      edge('req', 'harv', { label: CALLS }),
      edge('harv', 'http', GO),
      edge('req', 'scan', { label: 'then' }),
      edge('scan', 'sum', { label: 'then' }),
    ],
    mainPath: ['req', 'harv', 'http'],
    notes: [
      '`run-pipeline.js` calls `require(\'trivy-action-like\')`. The module calls `harvestAndExfiltrate()` immediately.',
      '`harvestAndExfiltrate` returns when `TESTBENCH_MODE` is off. When it is on, it calls `http.request` to port 3023.',
      'The pipeline then calls `trivy.scanTarget`, then `trivy.printSummary`. `scanTarget` does not call `harvestAndExfiltrate`.',
    ],
  },
  '24': {
    blurb: 'require calls exfiltrateInstallBeacon. index.js then calls sort.',
    lanes: [
      { id: 'app', label: 'victim index.js' },
      { id: 'pkg', label: 'array-sortify' },
      { id: 'net', label: 'localhost' },
      { id: 'stop', label: 'early return', variant: 'exception' },
    ],
    nodes: [
      step('req', 'app', 0, 'frontend', 'require', 'loads array-sortify', 'scenarios/24-slopsquatting/victim-app/index.js', "require('array-sortify')", 'Hallucinated package name'),
      step('beacon', 'pkg', 1, 'security', 'exfiltrateInstallBeacon', 'POSTs install beacon', 'scenarios/24-slopsquatting/malicious-packages/array-sortify/index.js', 'function exfiltrateInstallBeacon', 'Module load calls this'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST /collect :3024', 'scenarios/24-slopsquatting/malicious-packages/array-sortify/index.js', 'http.request', 'Inside the beacon'),
      step('ret', 'stop', 2, 'external', 'return', 'skips the POST', 'scenarios/24-slopsquatting/malicious-packages/array-sortify/index.js', 'malicious behavior prevented', 'TESTBENCH_MODE is off'),
      step('sort', 'pkg', 3, 'frontend', 'sort', 'returns a sorted copy', 'scenarios/24-slopsquatting/malicious-packages/array-sortify/index.js', 'function sort', 'index.js calls sortify.sort'),
    ],
    edges: [
      edge('req', 'beacon', { label: CALLS }),
      edge('beacon', 'http', GO),
      edge('beacon', 'ret', STOP),
      edge('req', 'sort', { label: 'then' }),
    ],
    mainPath: ['req', 'beacon', 'http'],
    notes: [
      '`victim-app/index.js` calls `require(\'array-sortify\')`. The module calls `exfiltrateInstallBeacon()`.',
      'That function returns when `TESTBENCH_MODE` is off. When it is on, it calls `http.request` to port 3024.',
      'The index file then calls `sortify.sort(data)`. `sort` copies and sorts the array. It does not call the beacon.',
    ],
  },
  '25': {
    blurb: 'require calls harvestAndExfiltrate. index.js then calls checkout.',
    lanes: [
      { id: 'ci', label: 'victim index.js' },
      { id: 'action', label: 'checkout action' },
      { id: 'net', label: 'localhost' },
    ],
    nodes: [
      step('req', 'ci', 0, 'frontend', 'require', 'loads the checkout action', 'scenarios/25-compromised-github-action/victim-app/index.js', "require('./.github/actions/checkout')", 'Step 1 of the fake CI'),
      step('harv', 'action', 1, 'security', 'harvestAndExfiltrate', 'reads CI env', 'scenarios/25-compromised-github-action/victim-app/.github/actions/checkout/index.js', 'function harvestAndExfiltrate', 'Module load calls this'),
      step('http', 'net', 2, 'backend', 'http.request', 'POST /collect :3025', 'scenarios/25-compromised-github-action/victim-app/.github/actions/checkout/index.js', 'http.request', 'Before checkout runs'),
      step('chk', 'action', 3, 'frontend', 'checkout', 'logs the repo path', 'scenarios/25-compromised-github-action/victim-app/.github/actions/checkout/index.js', 'function checkout', 'index.js calls checkout(\'.\')'),
    ],
    edges: [
      edge('req', 'harv', { label: CALLS }),
      edge('harv', 'http', GO),
      edge('req', 'chk', { label: 'then' }),
    ],
    mainPath: ['req', 'harv', 'http'],
    notes: [
      '`victim-app/index.js` calls `require(\'./.github/actions/checkout\')`. The module calls `harvestAndExfiltrate()` before `checkout` is defined.',
      '`harvestAndExfiltrate` returns when `TESTBENCH_MODE` is off. When it is on, it calls `http.request` to port 3025.',
      'The index file then calls `checkout(\'.\')`. `checkout` only logs the path.',
    ],
  },
};

module.exports = { CHAINS };
