# Compromised Mirror

⚠️ **WARNING**: This directory simulates a compromised registry mirror.

## Attack Scenario

The internal npm registry mirror has been compromised. When developers install packages, they receive malicious versions instead of legitimate ones.

## How It Works

1. Attacker compromises mirror server
2. Replaces legitimate packages with malicious versions
3. Mirror serves malicious packages to all developers
4. Developers install packages from mirror
5. Malicious postinstall scripts execute

## Detection

- Compare packages with upstream (npmjs.com)
- Verify package checksums
- Check for unexpected postinstall scripts
- Monitor mirror behavior

## Safety

- Only executes when TESTBENCH_MODE=enabled
- Only sends data to localhost
- Clearly marked as compromised
