# Provenance and enforcement

How SCAS proves authorship, and what to do when someone copies it without credit.

> Not legal advice. This page is the operational playbook that pairs with [LEGAL.md](LEGAL.md).

## The honest threat model

You cannot stop someone who has the source from deleting your name. Anyone who
claims a tool can prevent credit-stripping from readable source code is wrong.
What you *can* do - and what actually resolves disputes - is:

1. **Prove priority** - timestamped, third-party-verifiable evidence that you
   published first.
2. **Make stripping deliberate** - pervasive, served attribution that takes
   effort to remove, which turns "I didn't know" into willful infringement.
3. **Make copies detectable** - unique markers you can search for.

SCAS implements all three.

## Layer 1 - Priority proof (you were first)

| Mechanism | What it gives you | Setup |
|-----------|-------------------|-------|
| Signed git history | Every commit/tag bound to your GitHub SSH identity | `git config commit.gpgsign true` (already using SSH signing) |
| `ATTESTATION.json` + `.sig` | A signed statement binding your identity to a commit SHA and the fingerprint at a point in time | `./scripts/provenance/attest.sh` |
| OpenTimestamps | Bitcoin-blockchain-anchored timestamp that cannot be backdated | `ots stamp ATTESTATION.json` |
| Zenodo DOI | A citable, timestamped academic record of each release | Link the repo at zenodo.org |
| GitHub releases | Public, dated release artifacts | Publish releases, sign the tags |

Re-run `./scripts/provenance/attest.sh` at each release so the attestation
tracks the latest commit.

## Layer 2 - Inseparable attribution

- `SCAS_PROVENANCE.json` at the repo root is the canonical record.
- The fingerprint `SCAS-FP-RN-8d4f2c9a1e7b3065` is embedded in 100+ source
  files via `scripts/provenance/embed-scenario-provenance.sh`.
- The control plane serves `/api/provenance` and the dashboard renders an
  attribution footer on every page. A clone still shows your name unless the
  copier deliberately removes it - and deliberate removal of a served copyright
  notice is willful infringement under the MIT license, which is the fact that
  makes enforcement stick.

## Layer 3 - Detection

Find copies of your work:

- GitHub code search for the fingerprint: `SCAS-FP-RN-8d4f2c9a1e7b3065`
- Google the same string in quotes.
- Watch for forks that rename the project but keep scenario text or the
  `lesson.yaml` structure - those are derived from your originals.

Check a suspect checkout:

```bash
./scripts/provenance/verify-provenance.sh /path/to/suspect/copy
```

It reports whether the canonical file, fingerprints, and attestation survived.

## When you find an uncredited copy

1. **Screenshot and archive** the page (archive.org) before anything changes.
2. **Confirm** with `verify-provenance.sh` and by comparing git history.
3. **Ask nicely first** - most people add credit when pointed at LICENSE and
   LEGAL.md. A short message citing the fingerprint and the repo is usually
   enough.
4. **DMCA takedown** if they refuse: GitHub's form is at
   https://github.com/contact/dmca. Your signed attestation, git history, and
   the pervasive fingerprint are the evidence package. Willful removal of the
   notice (Layer 2) is the part that makes the claim hard to dodge.

## What the law already gives you

Copyright is automatic the moment you publish original work - you do not
register it to own it. The MIT license on the software and CC BY-NC-ND on the
docs both *require* attribution; a copy that strips your name is in breach of
the very license that permits the copying. The system above exists to make that
breach provable, dated, and deliberate.
