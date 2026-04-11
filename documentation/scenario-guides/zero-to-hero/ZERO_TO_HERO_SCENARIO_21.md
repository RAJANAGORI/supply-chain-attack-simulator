# Zero-to-Hero — Scenario 21: Axios-style compromised npm release

1. **Overview**: A trusted package patch can add a **transitive** your app never imports; **`postinstall`** still runs. This lab uses fictional **`axios-like`** / **`plain-crypto-js-like`** and **localhost** beacons only.
2. **Setup**: `cd scenarios/21-axios-compromised-release-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
3. **Mock server**: `node infrastructure/mock-server.js` (port **3021**)
4. **Malicious upgrade**: `cd victim-app && export TESTBENCH_MODE=enabled && npm install axios-like@file:../packages/axios-like-1.14.1.tgz`
5. **Run victim**: `npm start` — note the parent never `require()`s the transitive.
6. **Evidence**: `curl http://localhost:3021/captured-data` · `cat .testbench-axios-ioc.json`
7. **Detect**: `node detection-tools/axios-compromise-detector.js .` (from `victim-app` or pass path)
8. **Response**: pin exact versions, lockfile-only CI, review **`INIT_CWD`** vs nested `cwd` for lifecycle forensics, rotate tokens after real incidents.

**Exercises**

- Explain why **`bundledDependencies` + `npm pack`** is used in this lab to ensure the nested package installs.
- List three **IOC** fields you would hunt in a real org after an npm supply-chain alert.
