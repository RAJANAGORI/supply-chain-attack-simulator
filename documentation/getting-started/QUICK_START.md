# Quick start (CLI)

Get a lab running in about five minutes if you already have Node and know the basics.

Prefer clicking through a storyboard instead? Use the [Command Center guide](./COMMAND_CENTER.md) (`./run.sh` → `:3100`). Same labs; this page is the shell path.

## Install

### 1. Prerequisites

```bash
node --version   # v16+
npm --version    # v7+
```

Install from [nodejs.org](https://nodejs.org) if needed.

### 2. Clone and setup

```bash
git clone https://github.com/RAJANAGORI/supply-chain-attack-simulator.git
cd supply-chain-attack-simulator

chmod +x START_HERE.sh
./START_HERE.sh
source .scas.env
```

No flags: labs / workshop / docker. Labs only without the menu: `./START_HERE.sh -y --core-only`. Prefer Docker instead? See [DOCKER_LABS.md](./DOCKER_LABS.md).

### 3. Enable testbench mode

```bash
export TESTBENCH_MODE=enabled
```

### 4. Start the mock server (Scenario 1)

```bash
# After: cd scenarios/01-typosquatting && ./setup.sh
node scenarios/01-typosquatting/infrastructure/mock-server.js &

# Other scenarios ship their own server under that folder after ./setup.sh, e.g.:
# node scenarios/02-dependency-confusion/infrastructure/mock-server.js &
```

### 5. View captured data

```bash
curl http://localhost:3000/captured-data
```

## First scenario: typosquatting (~15 minutes)

### 1. Open the scenario

```bash
cd scenarios/01-typosquatting
./setup.sh
```

### 2. Look at legitimate vs malicious

```bash
cat legitimate/requests-lib/index.js
cat templates/malicious-package-template.js
```

### 3. Build the malicious package (if setup did not already)

```bash
mkdir -p malicious-packages/request-lib
cp templates/malicious-package-template.js malicious-packages/request-lib/index.js

cat > malicious-packages/request-lib/package.json << 'EOF'
{
  "name": "request-lib",
  "version": "1.0.0",
  "description": "HTTP request library [MALICIOUS - EDUCATIONAL]",
  "main": "index.js"
}
EOF
```

### 4. Run the victim app

```bash
cd victim-app
npm install ../malicious-packages/request-lib
export TESTBENCH_MODE=enabled
npm start
```

### 5. Check exfiltrated data

```bash
curl http://localhost:3000/captured-data
```

You should see data at the mock exfiltration endpoint.

## What you just did

1. Created a package that looks like a legitimate one
2. Simulated a typo (`request-lib` vs `requests-lib`)
3. Exfiltrated data to the mock attacker server
4. Saw how quiet that can look without detection tooling

## Try detection

```bash
cd ..
node ../../detection-tools/package-scanner.js victim-app
```

Expect signals around suspicious network requests and data exfiltration patterns.

## What next

1. [Dependency Confusion](../../scenarios/02-dependency-confusion/README.md)
2. [Compromised Package](../../scenarios/03-compromised-package/README.md)
3. Later: build pipelines, transitive deps, and the rest of the catalog

Tools worth knowing:

- `detection-tools/package-scanner.js`
- `detection-tools/network-monitor.sh`

More docs: [SETUP.md](SETUP.md) · [Best practices](../platform/BEST_PRACTICES.md) · [Detection & observability](../platform/DETECTION_AND_OBSERVABILITY.md)

## Tips

**Clear captured data between runs**

```bash
curl -X DELETE http://localhost:3000/captured-data
```

**Reset node_modules**

```bash
find . -name "node_modules" -type d -exec rm -rf {} +
```

**Save a capture**

```bash
curl http://localhost:3000/captured-data > my-analysis.json
```

## Troubleshooting

**Mock server not up?**

```bash
curl http://localhost:3000/captured-data
# If that fails, after ./setup.sh in the scenario folder:
node scenarios/01-typosquatting/infrastructure/mock-server.js &
```

**TESTBENCH_MODE?**

```bash
export TESTBENCH_MODE=enabled
# optional permanent:
echo 'export TESTBENCH_MODE=enabled' >> ~/.bashrc
source ~/.bashrc
```

## Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm Security Best Practices](https://docs.npmjs.com/security)
- [CISA supply chain security](https://www.cisa.gov/supply-chain)
- Real incidents: event-stream (2018), ua-parser-js (2021), colors.js (2022)
- Tools: [Socket.dev](https://socket.dev), [Snyk](https://snyk.io), [Dependabot](https://github.com/dependabot)

## Challenges (optional)

**Beginner:** change the exfiltration target, capture more fields, try another typo name.

**Intermediate:** obfuscate the payload, gate on "production", add a delayed trigger.

**Advanced:** multi-stage attack, persistence, or your own detector.

## Remember

This is a learning environment.

- Experiment here; break things safely
- Do not use these packages on real systems
- Do not publish malicious code
- Keep `TESTBENCH_MODE` for the labs

For a fuller install, see [SETUP.md](SETUP.md) or [Full-stack setup](./FULL_STACK_SETUP.md).
