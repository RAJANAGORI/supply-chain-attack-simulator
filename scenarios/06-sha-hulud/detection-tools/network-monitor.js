/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
 * Network Monitor for Shai-Hulud Worm Propagation
 *
 * Detects suspicious outbound connections during npm install — specifically
 * the postinstall payload beaconing to local mock servers (which in a real
 * scenario would be attacker-controlled infrastructure).
 */

require('../infrastructure/scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3005;
const logFile = path.join(__dirname, 'network-monitor.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ events: [] }, null, 2));
}

// ─── Known-safe ports (localhost only) ──────────────────────────────────────

const SAFE_PORTS = [3001, 3002, 3003]; // harvest, github-sim, registry
const SUSPICIOUS_PORTS = [443, 8443, 80, 8080, 3000]; // common exfil ports
const MONITORED_DOMAINS = [
  'raw.githubusercontent.com',
  'registry.npmjs.org',
  'api.github.com'
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logEvent(event) {
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  logs.events.push({
    timestamp: new Date().toISOString(),
    ...event
  });
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}

// ─── Outbound Connection Monitor ─────────────────────────────────────────────

/**
 * Simulates monitoring outbound network connections during npm install.
 * In a real deployment, this would use tcpdump or iptables.
 *
 * For the simulation, we hook into the mock server connections.
 */
function startNetworkMonitor() {
  const networkLog = [];
  const startTime = Date.now();

  console.log(`\n[net-monitor] Starting network monitor at port ${PORT}`);
  console.log(`[net-monitor] Monitoring for suspicious outbound connections...`);

  // Listen for connection requests to known-suspicious ports
  const connections = [];

  // We can't actually capture real network traffic from Node.js,
  // so we monitor via the mock server connection events
  const monitorServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/connect') {
      let body = '';
      req.on('data', (chunk) => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const connection = {
            timestamp: new Date().toISOString(),
            event: data.event || 'outbound_connection',
            destHost: data.destHost || 'unknown',
            destPort: data.destPort || 0,
            protocol: data.protocol || 'http',
            size: data.size || 0,
            duration: data.duration || 0,
            suspicious: isSuspicious(data.destPort, data.destHost),
            category: categorizeConnection(data.destPort, data.destHost),
            connectionId: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
          };
          connections.push(connection);
          logEvent(connection);

          console.log(`[net-monitor] ${connection.suspicious ? '⚠️  SUSPICIOUS' : '✓  normal'}: ${connection.destHost}:${connection.destPort} (${connection.category})`);

          // Forward to detection pipeline
          try {
            require('../../../detection-tools/es/forward-capture')
              .forwardCaptureIfEnabled(__dirname, {
                type: 'network',
                event: connection
              })
              .catch(() => {});
          } catch (_) {}

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'logged', id: connection.connectionId }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Request' }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/network-log') {
      const logs = fs.readFileSync(logFile, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(logs);
    } else if (req.method === 'DELETE' && req.url === '/network-log') {
      fs.writeFileSync(logFile, JSON.stringify({ events: [] }, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'cleared' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  monitorServer.listen(PORT, () => {
    console.log('[net-monitor] Network monitor active on port ' + PORT);
    console.log('[net-monitor] Safe ports: ' + SAFE_PORTS.join(', '));
    console.log('[net-monitor] Monitor suspicious ports: ' + SUSPICIOUS_PORTS.join(', '));
  });

  return monitorServer;
}

function isSuspicious(port, host) {
  if (SUSPICIOUS_PORTS.includes(port)) return true;
  // Any non-localhost destination on common ports
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('0.0.0.0')) {
    return true;
  }
  return false;
}

function categorizeConnection(port, host) {
  if (port === 3001) return 'token_harvest';
  if (port === 3002) return 'github_api';
  if (port === 3003) return 'package_registry';
  if (SUSPICIOUS_PORTS.includes(port)) return 'suspicious_exfil';
  if (SAFE_PORTS.includes(port)) return 'infrastructure';
  return 'unknown';
}

// ─── Start ───────────────────────────────────────────────────────────────────

if (require.main === module) {
  startNetworkMonitor();
} else {
  module.exports = { startNetworkMonitor, isSuspicious, categorizeConnection };
}
