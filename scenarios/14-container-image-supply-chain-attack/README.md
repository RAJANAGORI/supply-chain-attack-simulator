# Scenario 14: Container Image Supply Chain Attack

## Learning Objectives

- Understand how container images can carry malicious layers
- Detect malicious modifications in Dockerfiles and image layers
- Learn defenses: image signing, vulnerability scanning, provenance verification

## Scenario Description

A base image used by an organization has been modified in the image registry to include a hidden layer that exfiltrates secrets at container startup. Your task is to build the image, detect the malicious layer, and implement mitigations.

## Setup

```bash
cd scenarios/14-container-image-supply-chain-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## Safety

This scenario runs local-only mock exfiltration to a mock server. Do not push images to public registries.

