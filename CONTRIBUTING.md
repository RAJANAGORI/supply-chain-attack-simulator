# Contributing

Thanks for helping improve the Supply Chain Attack Test Bench.

## Copyright and licensing

The maintainers’ original work in this repository is **copyright Raja Nagori**
(see [LICENSE](LICENSE), [DOCUMENTATION-CC-BY-NC-ND.md](DOCUMENTATION-CC-BY-NC-ND.md),
[COPYRIGHT.md](COPYRIGHT.md), and [NOTICE](NOTICE)).

- **Software** contributions are licensed under the **MIT License**.
- **Documentation** contributions (`documentation/`, guides, modules, learning
  paths) are licensed under **CC BY-NC-ND 4.0** (see DOCUMENTATION-CC-BY-NC-ND.md).

The MIT License grants certain permissions for software; CC BY-NC-ND governs
documentation. Neither transfers ownership of the project’s copyright to
contributors or users.

### Developer Certificate of Origin (DCO)

By submitting a pull request or otherwise contributing code you did not write
as a maintainer, you certify that your contribution meets the
[Developer Certificate of Origin version 1.1](https://developercertificate.org/),
and you license that contribution under the **same terms as this repository**
(MIT for software; CC BY-NC-ND 4.0 for documentation under `documentation/`).

Sign your commits so this certification is recorded in git history:

```bash
git commit -s
```

That adds a `Signed-off-by` trailer. Pull requests without a sign-off may be
declined.

If you are unsure whether you have the right to contribute something (for
example code from your employer), resolve that **before** opening a PR.

## Before you start

- Use isolated test environments only (VM/container/local sandbox).
- Keep all attack simulation behavior gated behind `TESTBENCH_MODE=enabled`.
- Keep all simulated exfiltration localhost-only (`127.0.0.1` or `localhost`).
- Never add real malware, live credentials, or public exfiltration endpoints.

## Local setup

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Recommended toolchain:

- Node.js `20.x` (see `.nvmrc`)
- Python `3.11.x` (see `.python-version`)

## Project layout expectations

Most scenarios follow this pattern:

- `legitimate-*` and/or `compromised-*` or `malicious-packages/`
- `victim-app/`
- `infrastructure/`
- `detection-tools/`
- `setup.sh`
- `README.md`

For teaching consistency, use `documentation/modules/MODULE_TEMPLATE.md` when writing scenario documentation and module content.

## Add or update a scenario

1. Create or update the scenario directory under `scenarios/`.
2. Include a complete `README.md` with objectives, setup, attack flow, detection, and mitigations.
3. Ensure all simulated malicious behavior is testbench-gated and local-only.
4. Add or update any scenario-specific detection scripts.
5. Validate your scenario end-to-end locally.

## Code style and scripts

- Prefer small, focused changes.
- Keep shell scripts portable and executable.
- Keep documentation clear and task-oriented.
- Use explicit safety warnings in new scenario docs.

## Testing requirements

Run the full smoke test locally before opening a PR:

```bash
chmod +x scripts/*.sh
./scripts/smoke-all-scenarios.sh
```

If your change only affects one scenario, you should still run that scenario fully and confirm capture output appears as expected.

## Pull request checklist

Use the PR template and make sure all items are addressed, especially:

- `TESTBENCH_MODE` guards are present.
- Exfiltration is localhost-only.
- Smoke test passes locally.

## Reporting security issues

Please do not open public issues for sensitive disclosures. Follow `SECURITY.md` for responsible reporting details.
