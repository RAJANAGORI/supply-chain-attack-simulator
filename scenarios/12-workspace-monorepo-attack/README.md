# Scenario 12: Workspace/Monorepo Attack 🎯

> **Important:** This directory only contains `README.md` and `setup.sh` (plus embedded templates) until you run **`./setup.sh`**. That script generates the workspace root `package.json`, `packages/`, `legitimate-packages/`, `compromised-package/`, `victim-app/`, `infrastructure/mock-server.js`, `detection-tools/`, and other lab files. Run it once before commands like `cat package.json` or `ls packages/` below.










## Table of Contents

<div class="doc-toc">

- [🎓 Learning Objectives](#🎓-learning-objectives)
- [📖 Background](#📖-background)
- [🎯 Scenario Description](#🎯-scenario-description)
- [🔧 Setup](#🔧-setup)
- [Run the lab](#run-the-lab)
- [📝 Lab Tasks](#📝-lab-tasks)
- [Mitigation Playbook](#mitigation-playbook)
- [Straightforward Implementation](#straightforward-implementation)
- [📊 Key Takeaways](#📊-key-takeaways)
- [🔍 Real-World Impact](#🔍-real-world-impact)
- [⚠️ Safety & Ethics](#⚠️-safety--ethics)

</div>

---
## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How npm workspaces and monorepos work
- How attackers compromise workspace packages to affect entire monorepos
- Why workspace dependencies are a critical attack vector
- Techniques to detect compromised workspace packages
- Defense strategies for workspace and monorepo security
- Real-world examples of workspace/monorepo compromises

## 📖 Background

**Workspace/Monorepo Attack** occurs when an attacker compromises a package within an npm workspace or monorepo. Since workspace packages share the same repository and can access each other's code, compromising one package can affect all packages in the workspace. This is especially dangerous in modern development where monorepos are common.

Tools such as Nx and Turborepo add task orchestration and dependency graphs. Attackers can abuse these by adding cross-package task dependencies or by compromising a package that many tasks depend on. Reviewing the workspace graph and task boundaries is as important as reviewing the code itself.

### Why This Attack is Dangerous

1. **Shared Access**: Workspace packages can access each other's code
2. **Wide Impact**: One compromised package affects all packages in the workspace
3. **Trust Chain**: Developers trust all packages in their workspace
4. **Hard to Detect**: Workspace packages are often treated as internal and trusted
5. **Automatic Execution**: Postinstall scripts in workspace packages execute automatically
6. **Modern Development**: Monorepos are increasingly common (Lerna, Nx, Turborepo, etc.)

### Real-World Examples

- **Monorepo Compromises**: Multiple organizations have had workspace packages compromised
- **Internal Package Attacks**: Attackers compromise internal workspace packages
- **Credential Theft**: Compromised workspace packages used to steal credentials
- **Backdoor Installation**: Malicious packages installed through workspace dependencies
- **Build System Attacks**: Workspace packages used to compromise CI/CD pipelines

## 🎯 Scenario Description

**Scenario**: You work at "DevCorp" which uses an npm workspace or monorepo tool such as Nx or Turborepo. The workspace includes `@devcorp/utils`, `@devcorp/api`, and `@devcorp/auth`. An attacker has compromised `@devcorp/utils` and can now influence every package and task that depends on it. Your task is to:

1. **Red Team**: Execute a workspace/monorepo attack
2. **Blue Team**: Detect the compromised workspace package
3. **Security Team**: Implement workspace security defenses, including graph and task-boundary reviews

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Basic understanding of npm workspaces
- Understanding of monorepo structure

### Environment Setup

```bash
cd scenarios/12-workspace-monorepo-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

`./setup.sh` generates the workspace root `package.json`, `packages/`, `legitimate-packages/`, `compromised-package/`, `victim-app/`, `infrastructure/mock-server.js`, templates, and detection tools (see the note at the top of this README). When setup finishes, it prints the same numbered flow as **Run the lab** below.

## Run the lab

Use two terminals (or background the mock server). Paths are relative to `scenarios/12-workspace-monorepo-attack` unless noted.

### Terminal A - mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B - bootstrap workspace, swap compromised package, capture, victim app

Workspace root (scenario directory):

```bash
cat legitimate-packages/utils/index.js
cat legitimate-packages/api/index.js
cat compromised-package/utils/postinstall.js
cp -r legitimate-packages/* packages/
npm install
rm -rf packages/utils
cp -r compromised-package/utils packages/utils
export TESTBENCH_MODE=enabled
npm install
curl -s http://localhost:3000/captured-data
cd victim-app
npm install
export TESTBENCH_MODE=enabled
npm start
```

### Verify capture

```bash
curl -s http://localhost:3000/captured-data
```

### Blue team (optional)

From the workspace root (scenario directory):

```bash
node detection-tools/workspace-scanner.js .
```

## 📝 Lab Tasks

The sections below expand on **Run the lab** with analysis, detection, and prevention exercises.

### Part 1: Understanding Workspaces (20 minutes)

**Workspace Basics**:
- npm workspaces allow multiple packages in one repository
- Packages can depend on each other using the workspace protocol or (in this lab) relative **`file:`** links between `packages/*` peers so installs work consistently on current npm (e.g. npm 11)
- Workspace packages share the same `node_modules` (by default)
- Postinstall scripts in workspace packages execute during workspace install

**Your Tasks**:
- Examine the workspace structure
- Understand how workspace dependencies work
- Review workspace configuration

```bash
# Check workspace root package.json
cat package.json

# View workspace packages
ls -la packages/

# Check workspace dependencies
cat packages/utils/package.json
cat packages/api/package.json
```

### Part 2: The Attack - Workspace Package Compromise (30 minutes)

**Attack Scenario**: Attacker has compromised `@devcorp/utils` workspace package.

```bash
# Review the legitimate workspace package
cat legitimate-packages/utils/package.json
cat legitimate-packages/utils/index.js

# Review the compromised workspace package
cat compromised-package/utils/package.json
cat compromised-package/utils/postinstall.js
```

**What Happens**:
1. Attacker gains access to workspace repository
2. Compromises `@devcorp/utils` package
3. Adds malicious postinstall script
4. All packages in workspace depend on `@devcorp/utils`
5. When workspace is installed, malicious code executes
6. Data is exfiltrated from all workspace packages

### Part 3: Detection Methods (40 minutes)

**Detection Techniques**:
- Workspace package scanning
- Postinstall script analysis
- Dependency tree analysis
- Workspace integrity checking
- Behavioral monitoring

See detection tools and README for detailed detection methods.

### Part 4: Incident Response (30 minutes)

**Response Steps**:
1. Identify compromised workspace package
2. Remove compromised package from workspace
3. Restore legitimate version
4. Audit all workspace packages
5. Review workspace access controls

## Mitigation Playbook

- Assign CODEOWNERS to workspace package directories, root `package.json`, and task configuration files such as `nx.json` or `turbo.json`.
- Review `nx graph` or `turbo run` task boundaries before adding cross-package dependencies or tasks.
- Run workspace scans for lifecycle scripts, unexpected binaries, and dependency drift on every PR.
- Enforce `--ignore-scripts` in CI and require explicit allowlisting for required postinstall steps.
- Separate build/test/deploy permissions per workspace package and per CI stage.
- Treat every workspace package as a third-party dependency for security review.

## Straightforward Implementation

### 1. CODEOWNERS

```text
# .github/CODEOWNERS
/packages/*     @org/security-team @org/platform-team
/package.json   @org/security-team
/nx.json        @org/security-team
/turbo.json     @org/security-team
```

### 2. Workspace graph and task boundary review

```bash
# Nx
nx graph --file=dep-graph.json
# Turborepo
cat turbo.json | jq '.pipeline | keys'
```

### 3. CI gate

```yaml
# .github/workflows/workspace-audit.yml
- run: npm ci --ignore-scripts
- run: node scripts/audit-workspace-packages.js
- run: |
    # Fail if a task depends on a workspace package outside the approved graph
    node scripts/validate-task-boundaries.js --config nx.json
```

### 4. Policy

Treat every workspace package - and every task that touches it - as a third-party dependency for security review purposes.

## 📊 Key Takeaways

### Why Workspace Attacks Are Dangerous

1. **Shared Access**: Workspace packages can access each other
2. **Wide Impact**: One compromise affects entire workspace
3. **Trust**: Developers trust all workspace packages
4. **Hard to Detect**: Workspace packages treated as internal
5. **Modern Development**: Monorepos are increasingly common

### Best Practices

1. ✅ **Audit workspace packages** - Regularly audit all workspace packages
2. ✅ **Monitor postinstall scripts** - Monitor postinstall execution in workspaces
3. ✅ **Limit access** - Limit who can modify workspace packages
4. ✅ **Version control** - Use version control for all workspace changes
5. ✅ **Dependency review** - Review workspace dependencies carefully
6. ✅ **Integrity checks** - Verify workspace package integrity
7. ✅ **Incident plan** - Have incident response plan for workspace attacks

## 🔍 Real-World Impact

- **Monorepo Compromises**: Multiple organizations affected
- **Internal Package Attacks**: Workspace packages used for attacks
- **Detection Time**: Often weeks before discovery
- **Wide Impact**: All packages in workspace affected

## ⚠️ Safety & Ethics

**IMPORTANT**: This scenario is for **educational purposes only**.

- ✅ Use ONLY in isolated test environments
- ✅ Never deploy malicious code to production
- ✅ All malicious code requires `TESTBENCH_MODE=enabled`
- ✅ Workspaces are simulated for educational purposes

---

**Remember**: Workspace packages are a critical attack vector. Always audit workspace packages and monitor postinstall scripts!

🔐 Happy Learning!
