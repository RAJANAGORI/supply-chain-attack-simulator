# Frequently asked questions (FAQ)

Answers for the most common questions when using the Supply Chain Attack Simulator.

## Safety and ethics

### Is this safe to run on my laptop?

Only in an **isolated lab environment** (VM or dedicated machine). Malicious samples are gated by `TESTBENCH_MODE=enabled` and exfiltrate to **localhost only**, but you should still treat the repo as intentionally vulnerable code.

### Do I need internet access?

**npm/pip installs** may need network for dependencies. Exfiltration in labs does **not** contact external attacker infrastructure.

### Can I publish or deploy any of this code?

**No.** This is for education only. Do not publish malicious packages to public registries or deploy lab payloads outside isolated environments.

---

## Getting started

### Where do I start as a complete beginner?

1. Read [ZERO_TO_HERO.md](../getting-started/ZERO_TO_HERO.md)
2. Run `./START_HERE.sh` or follow [SETUP.md](../getting-started/SETUP.md)
3. Complete [Scenario 01](../../scenarios/01-typosquatting/) with [ZERO_TO_HERO_SCENARIO_01.md](../scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md)

### What's the difference between ZERO_TO_HERO.md and SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md?

| Doc | Purpose |
|-----|---------|
| [ZERO_TO_HERO.md](../getting-started/ZERO_TO_HERO.md) | Short getting-started guide for your **first lab** |
| [learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md](../learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md) | Full **curriculum** across all scenarios |

### What order should I run scenarios?

See [SCENARIO_LEARNING_PATH.md](../learning-path/SCENARIO_LEARNING_PATH.md). Minimum: **01 → 02 → 03**. Finish **01–05** before **06 (Shai-Hulud)**.

---

## Running labs

### Why does nothing happen when I run the victim app?

Almost always **`TESTBENCH_MODE` is not set**:

```bash
export TESTBENCH_MODE=enabled
echo $TESTBENCH_MODE   # should print: enabled
```

### Port already in use (EADDRINUSE)

A previous mock server is still running:

```bash
./scripts/kill-port.sh 3000
# or all known ports:
./scripts/kill-port.sh --all
```

Port reference: [OPERATIONS.md](./OPERATIONS.md) · [CATALOG.md](../scenario-guides/CATALOG.md)

### Scenario 11 folders don't exist

Run setup first — it generates the lab tree:

```bash
cd scenarios/11-registry-mirror-poisoning
./setup.sh
```

### Scenario 08: victim app conflicts with mock server on port 3000

Stop the mock server before `npm start` on the victim Express app (documented in scenario README and zero-to-hero guide).

---

## Detection and blue team

### Where are IOCs and detection rules?

Every scenario: `scenarios/<folder>/DETECT.md`

Example: [scenarios/01-typosquatting/DETECT.md](../../scenarios/01-typosquatting/DETECT.md)

### How do I run the package scanner?

```bash
node detection-tools/package-scanner.js scenarios/01-typosquatting/victim-app
node detection-tools/package-scanner.js scenarios/01-typosquatting/victim-app --json
```

### How do I use Elasticsearch and Kibana?

See [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md) and [observability/README.md](../../observability/README.md).

---

## Observability

### Elasticsearch returns 404 for scas-detections

The index is created on first document. Run a scenario with `SCAS_ES_URL` set, or backfill:

```bash
node detection-tools/es/ship-captures.js
```

### Kibana Discover is empty

Create data views and saved searches:

```bash
./scripts/setup-kibana-data-views.sh
```

### Smoke observability test fails on scanner findings

Scenario 01's package may produce **zero scanner findings** (subtle payload). The smoke script also runs `ship-captures.js` — ensure `captured-data.json` exists from a prior lab run.

---

## Documentation

### Which documentation is the source of truth?

**[`documentation/`](../README.md)** — this folder. The [`docs/`](../../docs/) folder adds GitHub Pages HTML and symlinks to the same Markdown.

### Where is the master index of all files?

[documentation/README.md](../README.md) and the [scenario catalog](../scenario-guides/CATALOG.md).

---

## Copyright and licensing

### Who owns Supply Chain Attack Simulator?

**Raja Nagori** holds copyright (© 2024–2026) in the original scenarios, documentation, curriculum, and related materials. See [AUTHORS.md](../../AUTHORS.md) and [LEGAL.md](../../LEGAL.md).

### Can someone copy this and claim they created it?

**No.** You must keep copyright and license notices. Removing attribution or presenting SCAS documentation as your own original work violates the licenses and may be subject to takedown (see [ATTRIBUTION.md](../../ATTRIBUTION.md)).

### What license applies?

| Material | License |
|----------|---------|
| Software (`scenarios/`, `scripts/`, tools) | [MIT](../../LICENSE) |
| Documentation (`documentation/`, guides, modules) | [CC BY-NC-ND 4.0](../../DOCUMENTATION-CC-BY-NC-ND.md) |

You may fork and use **software** under MIT with attribution. **Documentation** may be shared with credit but not commercially republished as modified derivatives without permission.

---

## Contributing and support

- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [SECURITY.md](../../SECURITY.md)
- [ROADMAP.md](../reference/ROADMAP.md)
- [GitHub Issues](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues)

---

## Still stuck?

1. Check the scenario README: `scenarios/NN-*/README.md`
2. Check the zero-to-hero guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_NN.md`
3. Run `./scripts/teardown.sh` and retry from `./setup.sh`
4. Open an issue with scenario number, OS, and error output
