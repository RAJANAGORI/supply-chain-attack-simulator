#!/usr/bin/env node
/**
 * Generate per-scenario docker-compose.yml, Dockerfile, and verify.sh
 * from scripts/docker/scenario-compose-meta.json (Scenario 01 pattern + families).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const META = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'scenario-compose-meta.json'), 'utf8')
);

function healthcheck(port) {
  return `      test:
        [
          "CMD",
          "node",
          "-e",
          "require('http').get('http://127.0.0.1:${port}/captured-data',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))",
        ]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 8s`;
}

function pythonHealthcheck(port) {
  return `      test:
        [
          "CMD",
          "python",
          "-c",
          "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${port}/captured-data')",
        ]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 8s`;
}

function flociVictimEnv() {
  return `    environment:
      TESTBENCH_MODE: enabled
      SCAS_FLOCI_ENABLED: "\${SCAS_FLOCI_ENABLED:-1}"
      SCAS_FLOCI_ENDPOINT: "\${SCAS_FLOCI_ENDPOINT:-http://host.docker.internal:4566}"
      AWS_ENDPOINT_URL: "\${AWS_ENDPOINT_URL:-http://host.docker.internal:4566}"
      AWS_ACCESS_KEY_ID: "\${AWS_ACCESS_KEY_ID:-test}"
      AWS_SECRET_ACCESS_KEY: "\${AWS_SECRET_ACCESS_KEY:-test}"
      AWS_DEFAULT_REGION: "\${AWS_DEFAULT_REGION:-us-east-1}"
      AWS_EC2_METADATA_DISABLED: "true"
      SCAS_ES_URL: "\${SCAS_ES_URL:-http://host.docker.internal:9200}"`;
}

function flociExtraHosts() {
  return `    extra_hosts:
      - "host.docker.internal:host-gateway"`;
}

function victimFlociVolumes() {
  return `    volumes:
      - ../../detection-tools:/lab/detection-tools:ro
      - ../../scripts/floci:/lab/scripts/floci:ro`;
}

function mockPlatformEnv() {
  return `    environment:
      SCAS_ES_URL: "\${SCAS_ES_URL:-http://host.docker.internal:9200}"`;
}

function dockerfileNode(meta) {
  const lines = [
    `# Auto-generated for ${meta.slug} — build context: scenarios/`,
    'FROM node:20-slim',
    '',
    'ENV TESTBENCH_MODE=enabled \\',
    '    NODE_ENV=development',
    '',
    'RUN apt-get update \\',
    ' && apt-get install -y --no-install-recommends git ca-certificates curl python3 python3-pip \\',
    ' && pip3 install --break-system-packages --no-cache-dir awscli \\',
    ' && rm -rf /var/lib/apt/lists/*',
    '',
    'WORKDIR /lab',
    '',
    'COPY _shared /lab/_shared',
    `COPY ${meta.slug} /lab/${meta.slug}`,
    '',
    `WORKDIR /lab/${meta.slug}`,
  ];
  if (meta.setup_in_image) {
    lines.push('RUN chmod +x setup.sh && ./setup.sh');
  } else if (meta.npm_install_app) {
    lines.push(`WORKDIR /lab/${meta.slug}/${meta.primary_app}`);
    lines.push('RUN npm install --omit=dev');
    lines.push(`WORKDIR /lab/${meta.slug}`);
  }
  lines.push('CMD ["sleep", "infinity"]');
  lines.push('');
  return lines.join('\n');
}

function dockerfilePython(meta) {
  return `# Auto-generated for ${meta.slug} — build context: scenarios/
FROM python:3.12-slim

ENV TESTBENCH_MODE=enabled \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

RUN apt-get update \\
 && apt-get install -y --no-install-recommends curl ca-certificates \\
 && pip install --no-cache-dir awscli \\
 && rm -rf /var/lib/apt/lists/*

WORKDIR /lab

COPY _shared /lab/_shared
COPY ${meta.slug} /lab/${meta.slug}

WORKDIR /lab/${meta.slug}
RUN chmod +x setup.sh && ./setup.sh

CMD ["sleep", "infinity"]
`;
}

function composeNodeFile(meta) {
  const project = `scas-${meta.slug}`;
  const port = meta.c2_port;
  const c2File = path.posix.basename(meta.c2_path);
  return `# Auto-generated local Docker lab — ${meta.slug}
# Floci: victim uses host.docker.internal:4566 (extra_hosts on mock-c2 netns)
# Usage:
#   docker compose up -d --build
#   docker compose exec victim bash
#   curl http://localhost:${port}/captured-data
#   docker compose down -v

name: ${project}

services:
  mock-c2:
    image: node:20-alpine
    container_name: ${project}-mock-c2
    working_dir: /scenarios/${meta.slug}/infrastructure
    volumes:
      - ./:/scenarios/${meta.slug}
      - ../_shared:/scenarios/_shared:ro
      - ../../detection-tools:/detection-tools:ro
${mockPlatformEnv()}
${flociExtraHosts()}
    command: ["node", "${c2File}"]
    ports:
      - "${port}:${port}"
    healthcheck:
${healthcheck(port)}

  victim:
    build:
      context: ..
      dockerfile: ${meta.slug}/Dockerfile
    container_name: ${project}-victim
    network_mode: "service:mock-c2"
${flociVictimEnv()}
${victimFlociVolumes()}
    depends_on:
      mock-c2:
        condition: service_healthy
    tty: true
    stdin_open: true
    command: ["sleep", "infinity"]
`;
}

function composeRegistry(meta) {
  const project = `scas-${meta.slug}`;
  const port = meta.c2_port;
  const rport = meta.registry_port;
  const c2File = path.posix.basename(meta.c2_path);
  return `# Auto-generated local Docker lab — ${meta.slug} (registry sidecar)
# Floci via host.docker.internal:4566
name: ${project}

services:
  mock-c2:
    image: node:20-alpine
    container_name: ${project}-mock-c2
    working_dir: /scenarios/${meta.slug}/infrastructure
    volumes:
      - ./:/scenarios/${meta.slug}
      - ../_shared:/scenarios/_shared:ro
      - ../../detection-tools:/detection-tools:ro
${mockPlatformEnv()}
${flociExtraHosts()}
    command: ["node", "${c2File}"]
    ports:
      - "${port}:${port}"
      - "${rport}:${rport}"
    healthcheck:
${healthcheck(port)}

  mock-registry:
    image: node:20-alpine
    container_name: ${project}-registry
    working_dir: /scenarios/${meta.slug}
    network_mode: "service:mock-c2"
    volumes:
      - ./:/scenarios/${meta.slug}
      - ../_shared:/scenarios/_shared:ro
      - ../../detection-tools:/detection-tools:ro
    command: ["node", "${meta.registry_path}"]
    depends_on:
      mock-c2:
        condition: service_healthy

  victim:
    build:
      context: ..
      dockerfile: ${meta.slug}/Dockerfile
    container_name: ${project}-victim
    network_mode: "service:mock-c2"
${flociVictimEnv()}
${victimFlociVolumes()}
    depends_on:
      mock-c2:
        condition: service_healthy
      mock-registry:
        condition: service_started
    tty: true
    stdin_open: true
    command: ["sleep", "infinity"]
`;
}

function composeShaHulud(meta) {
  const project = `scas-${meta.slug}`;
  return `# Auto-generated local Docker lab — ${meta.slug} (token-theft + re-publishing worm)
# Floci via host.docker.internal:4566
name: ${project}

services:
  credential-harvester:
    image: node:20-alpine
    container_name: ${project}-harvester
    working_dir: /scenarios/${meta.slug}
    volumes:
      - ./:/scenarios/${meta.slug}
      - ../_shared:/scenarios/_shared:ro
      - ../../detection-tools:/detection-tools:ro
${mockPlatformEnv()}
${flociExtraHosts()}
    command: ["node", "${meta.c2_path}"]
    ports:
      - "${meta.c2_port}:${meta.c2_port}"
      - "${meta.github_port}:${meta.github_port}"
      - "${meta.registry_port}:${meta.registry_port}"
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "require('http').get('http://127.0.0.1:${meta.c2_port}/captured-credentials',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))",
        ]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 8s

  github-actions-simulator:
    image: node:20-alpine
    container_name: ${project}-github
    working_dir: /scenarios/${meta.slug}
    network_mode: "service:credential-harvester"
    volumes:
      - ./:/scenarios/${meta.slug}
      - ../_shared:/scenarios/_shared:ro
      - ../../detection-tools:/detection-tools:ro
    command: ["node", "${meta.github_path}"]
    depends_on:
      credential-harvester:
        condition: service_healthy

  mock-registry:
    image: node:20-alpine
    container_name: ${project}-registry
    working_dir: /scenarios/${meta.slug}
    network_mode: "service:credential-harvester"
    volumes:
      - ./:/scenarios/${meta.slug}
      - ../_shared:/scenarios/_shared:ro
      - ../../detection-tools:/detection-tools:ro
    command: ["node", "${meta.registry_path}"]
    depends_on:
      credential-harvester:
        condition: service_healthy

  victim:
    build:
      context: ..
      dockerfile: ${meta.slug}/Dockerfile
    container_name: ${project}-victim
    network_mode: "service:credential-harvester"
${flociVictimEnv()}
${victimFlociVolumes()}
    depends_on:
      credential-harvester:
        condition: service_healthy
      github-actions-simulator:
        condition: service_started
      mock-registry:
        condition: service_started
    tty: true
    stdin_open: true
    command: ["sleep", "infinity"]
`;
}

function composePythonFixed(meta) {
  const project = `scas-${meta.slug}`;
  const port = meta.c2_port;
  return `# Auto-generated local Docker lab — ${meta.slug} (Python)
# Floci via host.docker.internal:4566
name: ${project}

services:
  mock-c2:
    image: python:3.12-alpine
    container_name: ${project}-mock-c2
    working_dir: /scenarios/${meta.slug}/infrastructure
    volumes:
      - ./:/scenarios/${meta.slug}
      - ../_shared:/scenarios/_shared:ro
      - ../../detection-tools:/detection-tools:ro
${mockPlatformEnv()}
${flociExtraHosts()}
    command: ["python", "mock_server.py"]
    ports:
      - "${port}:${port}"
    healthcheck:
${pythonHealthcheck(port)}

  victim:
    build:
      context: ..
      dockerfile: ${meta.slug}/Dockerfile
    container_name: ${project}-victim
    network_mode: "service:mock-c2"
${flociVictimEnv()}
${victimFlociVolumes()}
    depends_on:
      mock-c2:
        condition: service_healthy
    tty: true
    stdin_open: true
    command: ["sleep", "infinity"]
`;
}

function verifyScript(meta) {
  const port = meta.family === 'sha-hulud' ? meta.c2_port : meta.c2_port;
  const capturePath =
    meta.family === 'sha-hulud'
      ? `http://127.0.0.1:${port}/captured-data`
      : `http://127.0.0.1:${port}/captured-data`;
  // For sha-hulud harvester may use different URL - try captured-credentials too in verify
  const appRel = meta.primary_app;
  const trigger = meta.trigger.replace(/'/g, "'\\''");

  let clearBlock = `curl -sf -X DELETE "http://127.0.0.1:${port}/captured-data" >/dev/null || true`;
  let grepHint = meta.verify_grep;
  let fetchData = `DATA="$(curl -sf "$C2_URL/captured-data" 2>/dev/null || echo '{}')"`;
  if (meta.family === 'sha-hulud') {
    clearBlock = `curl -sf -X DELETE "http://127.0.0.1:${port}/captured-credentials" >/dev/null || true`;
    fetchData = `DATA="$(curl -sf "http://127.0.0.1:${port}/captured-credentials" 2>/dev/null || echo '{}')"`;
  }

  return `#!/usr/bin/env bash
# Auto-generated verify for ${meta.slug}
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="\${COMPOSE_FILE:-$ROOT/docker-compose.yml}"
C2_URL="\${C2_URL:-http://127.0.0.1:${port}}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

echo "===> Clearing prior captures"
${clearBlock}

echo "===> Triggering lab (${trigger})"
docker compose -f "$COMPOSE_FILE" exec -T victim \\
  bash -lc 'cd /lab/${meta.slug}/${appRel} && ${trigger}' || true

echo "===> Waiting for capture (grep: ${grepHint})"
ok=0
for _ in $(seq 1 30); do
  ${fetchData}
  if echo "$DATA" | grep -q '${grepHint}'; then
    ok=1
    break
  fi
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "Verification failed for ${meta.slug}" >&2
  echo "$DATA" || true
  exit 1
fi

echo "Verification successful: ${meta.slug}"
exit 0
`;
}

function writeScenario(meta) {
  const dir = path.join(ROOT, 'scenarios', meta.slug);
  if (!fs.existsSync(dir)) {
    console.error('Missing scenario dir:', meta.slug);
    return;
  }

  let compose;
  let dockerfile;
  switch (meta.family) {
    case 'node-registry':
      compose = composeRegistry(meta);
      dockerfile = dockerfileNode(meta);
      break;
    case 'sha-hulud':
      compose = composeShaHulud(meta);
      dockerfile = dockerfileNode(meta);
      break;
    case 'python':
      compose = composePythonFixed(meta);
      dockerfile = dockerfilePython(meta);
      break;
    case 'container':
    case 'trivy':
    case 'node-file':
    default:
      compose = composeNodeFile(meta);
      dockerfile = dockerfileNode(meta);
      break;
  }

  fs.writeFileSync(path.join(dir, 'docker-compose.yml'), compose);
  fs.writeFileSync(path.join(dir, 'Dockerfile'), dockerfile);
  const verify = verifyScript(meta);
  fs.writeFileSync(path.join(dir, 'verify.sh'), verify);
  fs.chmodSync(path.join(dir, 'verify.sh'), 0o755);

  const di = path.join(dir, '.dockerignore');
  if (!fs.existsSync(di)) {
    fs.writeFileSync(
      di,
      '**/node_modules\n**/captured-data.json\n**/captured-credentials.json\n**/.venv\n**/.DS_Store\n'
    );
  }

  console.log('wrote', meta.slug);
}

for (const meta of META) {
  writeScenario(meta);
}

console.log('Done:', META.length, 'scenarios');
