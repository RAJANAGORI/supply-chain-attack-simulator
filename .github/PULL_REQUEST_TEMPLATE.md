# Pull Request Checklist

## Summary

- Describe what changed and why.

## Testing

- [ ] I ran `./scripts/smoke-all-scenarios.sh` locally (or documented why not).
- [ ] I validated the affected scenario(s) end-to-end.

## Safety checklist (required for scenario changes)

- [ ] All malicious behavior is gated (for example `TESTBENCH_MODE=enabled`).
- [ ] Exfiltration endpoints are localhost-only (`127.0.0.1`/`localhost`).
- [ ] No real credentials, malware, or public attack infrastructure were added.

## Documentation

- [ ] I updated scenario documentation and relevant files under `documentation/`.
- [ ] I added learner-facing instructions if behavior or setup changed.

## Licensing (contributions)

- [ ] Each commit includes `Signed-off-by` (for example `git commit -s`), per [CONTRIBUTING.md](../CONTRIBUTING.md) and the [Developer Certificate of Origin](https://developercertificate.org/).

## Notes for reviewers

- Call out any trade-offs, follow-ups, or known limitations.
