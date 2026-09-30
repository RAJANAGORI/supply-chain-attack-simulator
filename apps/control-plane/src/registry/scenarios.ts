import type { ScenarioDefinition } from './types.js';
import { getRepoRoot } from '../env.js';

function scenarioPath(slug: string): string {
  return `${getRepoRoot()}/scenarios/${slug}`;
}

function mockService(id: string, port: number, file = 'mock-server.js'): ScenarioDefinition['services'][0] {
  return {
    id,
    label: `Mock server :${port}`,
    command: 'node',
    args: [`infrastructure/${file}`],
    cwd: '.',
    port,
  };
}

function capture(port: number, path = '/captured-data', label = 'Captured data'): ScenarioDefinition['captures'][0] {
  return {
    id: `capture-${port}`,
    label,
    url: `http://127.0.0.1:${port}${path}`,
    clearUrl: `http://127.0.0.1:${port}${path}`,
  };
}

function victimStep(id: string, label: string, command: string, args: string[] = [], cwd = 'victim-app'): ScenarioDefinition['steps'][0] {
  return { id, label, command, args, cwd };
}

function baseScenario(
  id: string,
  slug: string,
  title: string,
  level: ScenarioDefinition['level'],
  port: number,
  steps: ScenarioDefinition['steps'],
  extra: Partial<ScenarioDefinition> = {},
): ScenarioDefinition {
  const capturePath = extra.captures?.[0]?.url?.includes('/beacon')
    ? '/beacon'
    : extra.captures?.[0]?.url?.includes('/capture')
      ? '/capture'
      : '/captured-data';

  return {
    id,
    slug,
    title,
    level,
    ports: extra.ports ?? [port],
    setup: { command: './setup.sh', cwd: scenarioPath(slug) },
    services: extra.services ?? [mockService('mock', port)],
    steps,
    captures: extra.captures ?? [capture(port, capturePath)],
    floci: extra.floci,
    docs: {
      readme: `scenarios/${slug}/README.md`,
      detect: `scenarios/${slug}/DETECT.md`,
    },
  };
}

export const SCENARIOS: ScenarioDefinition[] = [
  baseScenario('01', '01-typosquatting', 'Typosquatting', 'Beginner', 3000, [
    victimStep('install', 'Install typosquatted package', 'npm', ['install', '../malicious-packages/request-lib']),
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ]),
  baseScenario('02', '02-dependency-confusion', 'Dependency confusion', 'Beginner', 3000, [
    victimStep('install', 'Install from attacker registry', 'npm', ['install'], 'corporate-app'),
    victimStep('run', 'Run corporate app', 'npm', ['start'], 'corporate-app'),
  ], {
    ports: [3000, 4874],
    services: [
      mockService('mock', 3000),
      { id: 'registry', label: 'Attacker registry :4874', command: 'node', args: ['infrastructure/registry-server.js'], cwd: '.', port: 4874 },
    ],
  }),
  baseScenario('03', '03-compromised-package', 'Compromised package', 'Beginner', 3000, [
    victimStep('run-legit', 'Run with legitimate package', 'npm', ['start']),
    victimStep('install-bad', 'Install compromised package', 'npm', ['install', '../compromised-package/secure-validator']),
    victimStep('run-bad', 'Run with compromised package', 'npm', ['start']),
  ]),
  baseScenario('04', '04-malicious-update', 'Malicious update', 'Intermediate', 3000, [
    victimStep('install', 'Install malicious update', 'npm', ['install', '../malicious-update/utils-helper'], 'victim-app'),
    victimStep('run', 'Run victim app', 'npm', ['start'], 'victim-app'),
  ]),
  baseScenario('05', '05-build-compromise', 'GitHub Actions workflow injection', 'Advanced', 3000, [
    victimStep('run-ci', 'Run compromised CI pipeline', 'bash', ['../run-ci.sh'], 'victim-app'),
  ], { floci: { seed: 'infrastructure/floci/seed.sh', verify: 'infrastructure/floci/verify.sh' } }),
  {
    id: '06',
    slug: '06-sha-hulud',
    title: 'Token-theft and re-publishing worm (Shai-Hulud)',
    level: 'Advanced',
    ports: [3001, 3002, 3003],
    setup: { command: './setup.sh', cwd: scenarioPath('06-sha-hulud') },
    services: [
      { id: 'harvester', label: 'Credential harvester :3001', command: 'node', args: ['infrastructure/credential-harvester.js'], cwd: '.', port: 3001 },
      { id: 'gha', label: 'GitHub Actions sim :3002', command: 'node', args: ['infrastructure/github-actions-simulator.js'], cwd: '.', port: 3002 },
      { id: 'registry', label: 'Mock registry :3003', command: 'node', args: ['infrastructure/mock-registry.js'], cwd: '.', port: 3003 },
    ],
    steps: [
      victimStep('install', 'Install compromised shai-hulud package', 'npm', ['install'], 'victim-app'),
      victimStep('run', 'Run victim app', 'npm', ['start'], 'victim-app'),
    ],
    captures: [
      { id: 'credentials', label: 'Harvested credentials', url: 'http://127.0.0.1:3001/captured-credentials', clearUrl: 'http://127.0.0.1:3001/captured-credentials' },
    ],
    floci: { seed: 'infrastructure/floci/seed.sh', verify: 'infrastructure/floci/verify.sh' },
    docs: { readme: 'scenarios/06-sha-hulud/README.md', detect: 'scenarios/06-sha-hulud/DETECT.md' },
  },
  baseScenario('07', '07-transitive-dependency', 'Transitive dependency', 'Intermediate', 3000, [
    victimStep('install', 'Install dependencies', 'npm', ['install']),
    {
      id: 'swap',
      label: 'Swap compromised transitive dep',
      command: 'bash',
      args: ['../swap-transitive.sh'],
      cwd: 'victim-app',
    },
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ]),
  baseScenario('08', '08-package-lock-file-manipulation', 'Package lock manipulation', 'Intermediate', 3000, [
    victimStep('install', 'Install from manipulated lockfile', 'npm', ['install']),
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ]),
  baseScenario('09', '09-package-signing-bypass', 'Package signing bypass', 'Advanced', 3000, [
    victimStep('install', 'Install unsigned compromised package', 'npm', ['install', '../compromised-package/secure-utils']),
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ]),
  baseScenario('10', '10-git-submodule-attack', 'Git submodule attack', 'Intermediate', 3000, [
    {
      id: 'install',
      label: 'Clone compromised repo + npm install',
      command: 'bash',
      args: ['../run-attack.sh'],
      cwd: 'victim-app',
    },
    {
      id: 'run',
      label: 'Run cloned victim project',
      command: 'node',
      args: ['index.js'],
      cwd: 'work/victim-clone',
    },
  ]),
  baseScenario('11', '11-registry-mirror-poisoning', 'Registry mirror poisoning', 'Advanced', 3000, [
    victimStep('install', 'Install from poisoned mirror', 'npm', ['install'], 'corporate-app'),
    victimStep('run', 'Run corporate app', 'node', ['index.js'], 'corporate-app'),
  ], {
    ports: [3000, 4873],
    services: [
      mockService('mock', 3000),
      { id: 'mirror', label: 'Poisoned registry :4873', command: 'node', args: ['infrastructure/registry-server.js'], cwd: '.', port: 4873 },
    ],
    floci: { seed: 'infrastructure/floci/seed.sh', verify: 'infrastructure/floci/verify.sh' },
  }),
  baseScenario('12', '12-workspace-monorepo-attack', 'Workspace / monorepo', 'Intermediate', 3000, [
    victimStep('install-root', 'Install workspace root', 'npm', ['install'], '.'),
    victimStep('install-api', 'Install api package', 'npm', ['install'], 'packages/api'),
    victimStep('install-utils', 'Install utils package', 'npm', ['install'], 'packages/utils'),
    {
      id: 'swap',
      label: 'Swap compromised @devcorp/utils',
      command: 'bash',
      args: ['./swap-compromised-utils.sh'],
      cwd: '.',
    },
    victimStep('run', 'Run victim app', 'npm', ['start'], 'victim-app'),
  ], { setup: { command: './setup.sh', cwd: scenarioPath('12-workspace-monorepo-attack') } }),
  baseScenario('13', '13-package-metadata-manipulation', 'Metadata manipulation', 'Intermediate', 3001, [
    victimStep('install', 'Install metadata-tampered package', 'npm', ['install', '../compromised-packages/clean-utils']),
    victimStep('run', 'Run victim app', 'node', ['index.js']),
  ], { captures: [capture(3001, '/captured-data', 'Captured metadata exfil')] }),
  baseScenario('14', '14-container-image-supply-chain-attack', 'Container image supply chain', 'Advanced', 3002, [
    victimStep('run', 'Run malicious container start', 'node', ['malicious-start.js'], 'images/compromised-image'),
  ], {
    ports: [3002],
    captures: [capture(3002, '/captured-data', 'Container exfil capture')],
    floci: { seed: 'infrastructure/floci/seed.sh', verify: 'infrastructure/floci/verify.sh' },
  }),
  baseScenario('15', '15-developer-tool-compromise', 'Developer tool compromise', 'Advanced', 3015, [
    {
      id: 'install',
      label: 'Install malicious developer tool',
      command: 'bash',
      args: ['./install-malicious-tool.sh'],
      cwd: '.',
    },
    victimStep('run', 'Run victim with malicious tool', 'npm', ['start']),
  ], { ports: [3015] }),
  baseScenario('16', '16-package-cache-poisoning', 'Package cache poisoning', 'Intermediate', 3016, [
    victimStep('install1', 'First install (poisons cache)', 'npm', ['install']),
    victimStep('install2', 'Second install (reuses poisoned cache)', 'npm', ['install']),
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ], { ports: [3016] }),
  baseScenario('17', '17-multi-stage-attack-chain', 'Multi-stage attack chain', 'Advanced', 3017, [
    victimStep('install', 'Install staged packages', 'npm', ['install', '../packages/stage1-access-lib', '../packages/stage2-compromised-lib']),
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ], { ports: [3017], floci: { seed: 'infrastructure/floci/seed.sh', verify: 'infrastructure/floci/verify.sh' } }),
  baseScenario('18', '18-package-manager-plugin-attack', 'Package manager plugin', 'Advanced', 3018, [
    {
      id: 'install',
      label: 'pnpm install (fires .pnpmfile.cjs hooks)',
      command: 'bash',
      args: ['./install-with-hooks.sh'],
      cwd: '.',
    },
    victimStep('run', 'Run victim (plugin hooks fire)', 'npm', ['start']),
  ], { ports: [3018] }),
  baseScenario('19', '19-sbom-manipulation-attack', 'SBOM manipulation', 'Advanced', 3019, [
    victimStep('install', 'Install dependencies', 'npm', ['install']),
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ], { ports: [3019], floci: { seed: 'infrastructure/floci/seed.sh', verify: 'infrastructure/floci/verify.sh' } }),
  baseScenario('20', '20-package-version-confusion', 'Package version confusion', 'Advanced', 3020, [
    victimStep('install', 'Install dependencies', 'npm', ['install']),
    victimStep('run', 'Run victim (highest version wins)', 'npm', ['start']),
  ], { ports: [3020] }),
  baseScenario('21', '21-axios-compromised-release-attack', 'Axios-style npm release', 'Advanced', 3021, [
    {
      id: 'install',
      label: 'Install compromised release tarball',
      command: 'bash',
      args: ['./install-compromised-release.sh'],
      cwd: '.',
    },
    victimStep('run', 'Run victim app', 'npm', ['start']),
  ], {
    ports: [3021],
    captures: [{ id: 'beacon', label: 'Beacon captures', url: 'http://127.0.0.1:3021/captured-data', clearUrl: 'http://127.0.0.1:3021/captured-data' }],
  }),
  {
    id: '22',
    slug: '22-litellm-pypi-compromise',
    title: 'LiteLLM-style PyPI compromise',
    level: 'Advanced',
    ports: [3022],
    setup: { command: './setup.sh', cwd: scenarioPath('22-litellm-pypi-compromise') },
    services: [
      {
        id: 'mock-py',
        label: 'Python mock server :3022',
        // stdlib-only mock — do not require .venv (ensurepip may be missing on the host)
        command: 'python3',
        args: ['infrastructure/mock_server.py'],
        cwd: '.',
        port: 3022,
      },
    ],
    steps: [
      {
        id: 'install',
        label: 'pip install compromised 1.82.7',
        command: 'bash',
        args: ['-c', 'source .venv/bin/activate && pip install -U ../python-packages/v1_82_7'],
        cwd: 'victim-app',
      },
      {
        id: 'run',
        label: 'Run victim (import litellm_like)',
        command: 'bash',
        args: ['-c', 'source .venv/bin/activate && python run_victim.py'],
        cwd: 'victim-app',
      },
    ],
    captures: [capture(3022)],
    docs: { readme: 'scenarios/22-litellm-pypi-compromise/README.md', detect: 'scenarios/22-litellm-pypi-compromise/DETECT.md' },
  },
  baseScenario('23', '23-trivy-supply-chain-attack', 'Trivy supply chain attack', 'Advanced', 3023, [
    victimStep('install', 'Install compromised trivy module', 'npm', ['install'], 'victim-ci'),
    // package.json exposes "ci" (node run-pipeline.js), not "start"; source planted CI secrets first
    victimStep(
      'run',
      'Run CI victim',
      'bash',
      ['-c', 'set -a && source ../.env.ci-lab && set +a && npm run ci'],
      'victim-ci',
    ),
  ], {
    ports: [3023],
    services: [{ id: 'mock-c2', label: 'Mock C2 server :3023', command: 'node', args: ['infrastructure/mock-c2-server.js'], cwd: '.', port: 3023 }],
    floci: { seed: 'infrastructure/floci/seed.sh', verify: 'infrastructure/floci/verify.sh' },
  }),
  baseScenario('24', '24-slopsquatting', 'Slopsquatting', 'Intermediate', 3024, [
    victimStep('install', 'Install hallucinated package', 'npm', ['install', 'array-sortify'], 'victim-app'),
    victimStep('run', 'Run victim app', 'npm', ['start'], 'victim-app'),
  ], { ports: [3024] }),
  baseScenario('25', '25-compromised-github-action', 'Compromised reusable GitHub Action', 'Advanced', 3025, [
    victimStep('run', 'Run compromised workflow', 'bash', ['../run-ci.sh'], 'victim-app'),
  ], { ports: [3025] }),
];

export function getScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((s) => s.id === id || s.slug === id);
}
