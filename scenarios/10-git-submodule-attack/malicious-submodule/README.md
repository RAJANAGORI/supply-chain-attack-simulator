# Malicious Submodule

⚠️ **WARNING**: This is a malicious submodule for educational purposes only.

This submodule demonstrates how attackers can use git submodules to inject malicious code into legitimate repositories.

## Attack Vector

1. Attacker adds this submodule to a legitimate repository
2. Submodule contains postinstall script
3. When developers clone or update submodules, script executes
4. Malicious code runs automatically

## Safety

- Only executes when TESTBENCH_MODE=enabled
- Only sends data to localhost
- Clearly marked as malicious

