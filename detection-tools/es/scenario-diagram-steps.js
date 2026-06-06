/**
 * Learner-facing sequence diagram content for zero-to-hero observability sections.
 * Keep messages aligned with each scenario README "Run the lab" flow.
 */

const SCENARIO_DIAGRAMS = {
  '01': {
    intro: 'Typosquatting: a mistyped package name (`request-lib`) is installed, executes on import, and beacons to the mock server.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install ../malicious-packages/request-lib' },
      { from: 'Learner', to: 'Victim', message: 'npm start (TESTBENCH_MODE=enabled)' },
      { from: 'Victim', to: 'MalPkg', message: 'require("request-lib") loads typosquatted module' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Collect env vars + package metadata (lab-safe subset)' }
    ]
  },
  '02': {
    intro: 'Dependency confusion: a scoped internal name resolves to a higher public version and exfiltrates from corporate-app.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install in corporate-app (no .npmrc scope lock)' },
      { from: 'Victim', to: 'MalPkg', message: 'Resolver picks @techcorp/auth-lib v999.999.999' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Run dependency-confusion payload on load' }
    ]
  },
  '03': {
    intro: 'Compromised package: a maintainer-hijacked release of secure-validator runs malicious code after install.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install (pulls compromised secure-validator)' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'Victim', to: 'MalPkg', message: 'require compromised secure-validator' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Execute trojanized release logic' }
    ]
  },
  '04': {
    intro: 'Malicious update: npm update pulls a trojanized utils-helper version with new exfil behavior.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm update utils-helper (trusted name, bad version)' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'Victim', to: 'MalPkg', message: 'Load updated utils-helper module' },
      { from: 'MalPkg', to: 'MalPkg', message: 'New update channel triggers exfil stub' }
    ]
  },
  '05': {
    intro: 'Build compromise: tampered build output is copied into victim-app/dist before the app runs.',
    attack_steps: [
      { from: 'Learner', to: 'MalPkg', message: 'cd compromised-build && npm run build' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Build script injects payload into dist/ artifacts' },
      { from: 'Learner', to: 'Victim', message: 'cp compromised-build/dist/* victim-app/dist/' },
      { from: 'Learner', to: 'Victim', message: 'npm start — runs trojanized bundle' }
    ]
  },
  '06': {
    intro: 'Shai-Hulud simulation: postinstall on data-processor harvests credentials to credential-harvester :3001.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install ../compromised-package/data-processor' },
      { from: 'Victim', to: 'MalPkg', message: 'npm lifecycle runs postinstall script' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Scan for tokens / npmrc paths (simulated)' },
      { from: 'Learner', to: 'Victim', message: 'npm start (optional second-stage behavior)' }
    ]
  },
  '07': {
    intro: 'Transitive dependency: victim-app trusts web-utils; hidden data-processor dependency exfiltrates.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install (pulls web-utils + transitive deps)' },
      { from: 'Victim', to: 'MalPkg', message: 'web-utils requires nested data-processor' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Transitive payload executes without direct dependency' }
    ]
  },
  '08': {
    intro: 'Lockfile manipulation: tampered package-lock.json installs evil-utils instead of the intended package.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install (honors manipulated package-lock.json)' },
      { from: 'Victim', to: 'MalPkg', message: 'Install evil-utils from lockfile entry' },
      { from: 'MalPkg', to: 'MalPkg', message: 'postinstall / load hook fires during install' },
      { from: 'Learner', to: 'Victim', message: 'npm start (after stopping mock-server if port 3000 busy)' }
    ]
  },
  '09': {
    intro: 'Signing bypass: secure-utils appears signed but key material was compromised.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install secure-utils (forged signature accepted)' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'Victim', to: 'MalPkg', message: 'Load "signed" secure-utils module' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Execute compromised signed release' }
    ]
  },
  '10': {
    intro: 'Git submodule attack: malicious-submodule postinstall runs when the developer initializes submodules.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'git submodule update --init (lab setup)' },
      { from: 'Learner', to: 'Victim', message: 'bash malicious-submodule/postinstall.sh' },
      { from: 'Victim', to: 'MalPkg', message: 'Submodule hook executes bundled script' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Collect repo / env indicators (simulated)' }
    ]
  },
  '11': {
    intro: 'Registry mirror poisoning: corporate-app installs from compromised-mirror instead of legitimate-packages.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install (uses poisoned internal mirror path)' },
      { from: 'Victim', to: 'MalPkg', message: 'Resolve enterprise-utils / secure-lib from mirror' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Poisoned mirror package executes' }
    ]
  },
  '12': {
    intro: 'Workspace monorepo: compromised @devcorp/utils inside the workspace is linked into victim-app.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install at workspace root' },
      { from: 'Victim', to: 'MalPkg', message: 'Workspace links @devcorp/utils into victim-app' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Compromised workspace package runs on import' }
    ]
  },
  '13': {
    intro: 'Metadata manipulation: clean-utils package.json spoof misleads install; mock listens on :3001 /capture.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install ../compromised-packages/clean-utils' },
      { from: 'Victim', to: 'MalPkg', message: 'Trust spoofed repository / author metadata' },
      { from: 'Learner', to: 'Victim', message: 'node index.js' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Metadata-matched package executes hidden logic' }
    ]
  },
  '14': {
    intro: 'Container supply chain: compromised-image entrypoint sends build-time payload to mock-server :3002.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'TESTBENCH_MODE=enabled node images/compromised-image/malicious-start.js' },
      { from: 'Victim', to: 'MalPkg', message: 'Compromised image layer / entrypoint runs' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Simulated container startup exfil stub' },
      { from: 'Learner', to: 'Victim', message: '(Optional) docker run scas-compromised image' }
    ]
  },
  '15': {
    intro: 'Developer tool compromise: malicious-dev-tool postinstall runs when victim-app installs the tool.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install ../dev-tools/malicious-dev-tool' },
      { from: 'Victim', to: 'MalPkg', message: 'Dev-tool lifecycle hook executes on install' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Harvest IDE / shell adjacent paths (simulated)' }
    ]
  },
  '16': {
    intro: 'Cache poisoning: repeated npm install reuses poisoned cache-lib artifact from cache/.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install (first pass — seeds poisoned cache-lib)' },
      { from: 'Learner', to: 'Victim', message: 'rm node_modules && npm install again (cache hit)' },
      { from: 'Victim', to: 'MalPkg', message: 'Load cache-lib from poisoned local cache/' },
      { from: 'Learner', to: 'Victim', message: 'npm start — same bad bits reinstalled' }
    ]
  },
  '17': {
    intro: 'Multi-stage chain: stage1-access-lib enables stage2-compromised-lib exfil at runtime.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install stage1-access-lib + stage2-compromised-lib' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'Victim', to: 'MalPkg', message: 'Stage 1 loads → triggers stage 2 payload' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Chained exfil completes (stage 3 simulated in logs)' }
    ]
  },
  '18': {
    intro: 'Plugin attack: malicious-plugin hooks npm install for target-lib inside victim-app.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm start (plugin registered in .npmrc / config)' },
      { from: 'Victim', to: 'MalPkg', message: 'malicious-plugin intercepts install lifecycle' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Modify / observe target-lib resolution (simulated)' },
      { from: 'Learner', to: 'Victim', message: 'Observe capture + plugin logs' }
    ]
  },
  '19': {
    intro: 'SBOM manipulation: malicious-lib runs at runtime but is omitted from generated sbom.json.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install (includes hidden malicious-lib)' },
      { from: 'Learner', to: 'Victim', message: 'npm start — generates incomplete SBOM' },
      { from: 'Victim', to: 'MalPkg', message: 'malicious-lib executes despite SBOM gap' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Compare truth/dependencies.json vs victim-app/sbom.json' }
    ]
  },
  '20': {
    intro: 'Version confusion: semver picks version-confuser-lib 999.999.999 over the expected 1.x release.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install (registry/ layout serves many versions)' },
      { from: 'Victim', to: 'MalPkg', message: 'Resolver selects highest matching 999.999.999' },
      { from: 'Learner', to: 'Victim', message: 'npm start' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Malicious high-version package executes' }
    ]
  },
  '21': {
    intro: 'Axios-style release: axios-like@1.14.1 bundles a transitive with postinstall; beacon goes to /beacon.',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'npm install axios-like@file:../packages/axios-like-1.14.1.tgz' },
      { from: 'Victim', to: 'MalPkg', message: 'Transitive plain-crypto-js-like postinstall runs' },
      { from: 'Learner', to: 'Victim', message: 'npm start (parent never imports transitive directly)' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Write .testbench-axios-ioc.json + beacon payload' }
    ]
  },
  '22': {
    intro: 'LiteLLM-style PyPI: litellm_like exfil on import (1.82.7) or via .pth at interpreter startup (1.82.8).',
    attack_steps: [
      { from: 'Learner', to: 'Victim', message: 'pip install ../python-packages/v1_82_7 (or v1_82_8)' },
      { from: 'Learner', to: 'Victim', message: 'python run_victim.py OR python -c "print(1)" (.pth path)' },
      { from: 'Victim', to: 'MalPkg', message: 'Import hook or .pth loads litellm_like payload' },
      { from: 'MalPkg', to: 'MalPkg', message: 'Write .testbench-litellm-*.json markers' }
    ]
  }
};

module.exports = { SCENARIO_DIAGRAMS };
