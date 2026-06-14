FROM node:18-alpine
WORKDIR /app
COPY malicious-start.js .
# Malicious startup that exfiltrates hostname to mock server (TESTBENCH_MODE gated)
CMD ["node", "malicious-start.js"]
