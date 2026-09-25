---
name: scas-scenario-docs
description: Author and maintain SCAS scenario documentation so every lab ships with copy-pasteable mitigation and implementation guidance. Use when creating a new scenario under scenarios/, updating DETECT.md or README.md mitigations, or adding Straightforward Implementation sections.
disable-model-invocation: true
---

# SCAS Scenario Documentation

Use this skill when writing or editing SCAS supply-chain attack lab documentation. Every scenario must teach the attack and also tell the reader exactly how to defend against it in a real pipeline.

## Required files per scenario

```text
scenarios/NN-slug/
├── README.md               # Lab instructions + Mitigation Playbook + Straightforward Implementation
├── DETECT.md               # IOCs, detection rules, Mitigation, Straightforward Implementation
├── setup.sh
├── infrastructure/
├── victim-app/
├── malicious-packages/ or templates/
└── detection-tools/        # optional
```

## Documentation rules

- Use **ASCII hyphen-minus** `-` and **straight quotes** `"` / `'`. Never use em dash, en dash, curly quotes, or zero-width marks. CI enforces this.
- Canonical doc source lives in `documentation/`; `docs/` is a GitHub Pages mirror of symlinks.
- Canonical mitigation and implementation content lives in `scripts/lib/mitigation-playbooks.js`.
- After any change, run the doc sync and validation commands in the lifecycle section below.

## Mitigation section standard

Every `DETECT.md` and README `## Mitigation Playbook` must contain:

1. **Prevention config** - exact file path and snippet (`.npmrc`, `package.json`, `.github/workflows/*.yml`, etc.)
2. **CI gate** - a job or step that fails the pipeline when the control is violated
3. **Detection rule location** - where to deploy the Sigma/YARA/SIEM rule
4. **Incident response commands** - what to run if the control fires

Avoid generic bullets like "verify signatures" or "monitor behavior" without a command, config file, or tool name.

## Straightforward Implementation block

Add a `## Straightforward Implementation` section immediately after `## Mitigation` in `DETECT.md` and after `## Mitigation Playbook` in `README.md`.

Use this template:

```markdown
## Straightforward Implementation

### 1. Prevention config

```ini
# .npmrc
@myorg:registry=https://internal.registry.example/
ignore-scripts=true
```

### 2. CI gate

```yaml
# .github/workflows/security.yml
- name: Install without lifecycle scripts
  run: npm ci --ignore-scripts
```

### 3. Detection rule location

Deploy the Sigma rule to Splunk, Elastic, or Chronicle under the supply-chain detection folder.

### 4. Incident response

```bash
# Example revocation command
npm token revoke <token-id>
```
```

Keep sections concise. Prefer one clear tool or command per step.

## Canonical source

Edit scenario mitigations and implementation blocks in `scripts/lib/mitigation-playbooks.js` first, then sync downstream.

Data structure:

```javascript
const PLAYBOOKS = {
  'NN': {
    scenarioDir: 'NN-slug',
    bullets: [
      'High-level mitigation statement.',
    ],
    implementation: `
## Straightforward Implementation

### 1. Prevention config
...
`,
  },
};
```

## Documentation lifecycle

After editing `scripts/lib/mitigation-playbooks.js` or any `DETECT.md`:

```bash
# Sync DETECT.md Mitigation + README playbooks
node scripts/docs/sync-mitigation-gaps.js

# Sync zero-to-hero Mitigation Playbook sections
node scripts/docs/inject-zero-to-hero-mitigation-playbooks.js

# Rebuild all Tables of Contents
node scripts/docs/inject-markdown-toc.js all

# Validate public counts, indexes, and ranges
node scripts/docs/check-info-consistency.js

# Validate ASCII hyphen / straight quotes only
node scripts/docs/check-markdown-watermarks.js
```

If `DETECT.md` structure changes, also reload runbooks:

```bash
node detection-tools/es/load-runbooks.js
```

## Adding a new scenario

1. Add the scenario to `scripts/lib/mitigation-playbooks.js` with `bullets` and `implementation`.
2. Run `node scripts/docs/sync-mitigation-gaps.js`.
3. Run `node scripts/docs/inject-zero-to-hero-mitigation-playbooks.js`.
4. Update `documentation/scenario-guides/CATALOG.md` and the zero-to-hero / quick-reference indexes.
5. Update `scripts/setup/ports.env` and `documentation/platform/OPERATIONS.md` if the scenario needs a new port.
6. Run `node scripts/docs/check-info-consistency.js`.

## Tooling references

- Full doc lifecycle: `documentation/platform/TOOLING.md`
- Detection and observability: `documentation/platform/DETECTION_AND_OBSERVABILITY.md`
- Best practices: `documentation/platform/BEST_PRACTICES.md`
