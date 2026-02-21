# Quick Reference — Scenario 13: Package Metadata Manipulation

- Goal: Detect manipulated package metadata (repository, author, tarball integrity)
- Start mock server: `node scenarios/13-package-metadata-manipulation/infrastructure/mock-server.js`
- In victim: `cd scenarios/13-package-metadata-manipulation/victim-app && npm install`
- Replace local package: `cp -r ../compromised-packages/clean-utils node_modules/clean-utils`
- Run detection: `node ../detection-tools/metadata-validator.js node_modules/clean-utils`

Expected: metadata-validator flags repository/author/integrity mismatches; mock server records any postinstall callbacks.

