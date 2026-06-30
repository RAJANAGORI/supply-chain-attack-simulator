/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 23: Trivy Supply Chain Attack — Mock C2 Server
 * Simulates the attacker-controlled exfiltration endpoint.
 * In the real CVE-2026-33634 incident, stolen data was sent to
 * the typosquatted domain scan.aquasecurtiy[.]org.
 * Here it posts to localhost:3023/collect only.
 */

require('../../_shared/scenario-provenance');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3023;
const logFile = path.join(__dirname, 'captured-data.json');

// Initialize log file
if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/collect') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                console.log('\n\uD83C\uDFAF CAPTURED DATA (simulated TeamPCP exfil):');
                console.log(JSON.stringify(data, null, 2));
                console.log('\u2500'.repeat(50));

                const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                const captureEntry = {
                    timestamp: new Date().toISOString(),
                    data: data
                };
                captures.captures.push(captureEntry);
                fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Data received' }));

                try {
                    require('../../../detection-tools/es/forward-capture')
                        .forwardCaptureIfEnabled(__dirname, captureEntry)
                        .catch(() => {});
                } catch (_) {
                    /* optional ES forwarding; capture already persisted */
                }
            } catch (e) {
                console.error('Error processing data:', e);
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
    } else if (req.method === 'GET' && req.url === '/captured-data') {
        const captures = fs.readFileSync(logFile, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(captures);
    } else if (req.method === 'DELETE' && req.url === '/captured-data') {
        fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Data cleared' }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log('\uD83C\uDFAD Mock C2 Server Started (Scenario 23 — Trivy Supply Chain Attack)');
    console.log('\u2500'.repeat(50));
    console.log(`Listening on http://localhost:${PORT}`);
    console.log('');
    console.log('In the real attack: scan.aquasecurtiy[.]org (typosquatted domain)');
    console.log('In this lab:        127.0.0.1:3023 (safe, localhost only)');
    console.log('');
    console.log('Endpoints:');
    console.log(`  POST   /collect        - Receive exfiltrated CI secrets`);
    console.log(`  GET    /captured-data  - View captured data`);
    console.log(`  DELETE /captured-data  - Clear captured data`);
    console.log('\u2500'.repeat(50));
    console.log('Waiting for data...\n');
});
