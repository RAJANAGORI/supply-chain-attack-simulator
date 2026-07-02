# Scenario 14 + Floci

Adds **ECR push** and **S3 runtime markers** to the container supply chain lab.

```bash
# repo root: ./scripts/floci-setup.sh && ./scripts/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
./infrastructure/floci/seed.sh
node infrastructure/mock-server.js &
TESTBENCH_MODE=enabled node images/compromised-image/malicious-start.js
docker build -t scas-compromised images/compromised-image
./infrastructure/floci/push-compromised.sh
./infrastructure/floci/verify.sh
```

Runtime simulation still beacons to `:3002`; Floci track adds cloud registry trust abuse.

After `./infrastructure/floci/push-compromised.sh`, optionally run:

```bash
./infrastructure/floci/run-compromised-task.sh
```

This requests an **ECS RunTask** on cluster `scas-sc14` using task definition `scas-sc14-compromised`.

