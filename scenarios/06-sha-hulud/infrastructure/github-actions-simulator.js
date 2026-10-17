/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
 * GitHub Actions Simulator
 *
 * Enhanced 2026-10-13: Simulates CI check pipelines and PR review lifecycle
 * to model how backdoor PRs are caught (or not) in well-configured orgs.
 */

require('./scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const prLogFile = path.join(__dirname, 'backdoor-prs.json');
const repoLogFile = path.join(__dirname, 'repo-logs.json');
const ciLogFile = path.join(__dirname, 'ci-audit-trail.json');

if (!fs.existsSync(prLogFile)) {
  fs.writeFileSync(prLogFile, JSON.stringify({ prs: [] }, null, 2));
}
if (!fs.existsSync(repoLogFile)) {
  fs.writeFileSync(repoLogFile, JSON.stringify({ repos: [] }, null, 2));
}
if (!fs.existsSync(ciLogFile)) {
  fs.writeFileSync(ciLogFile, JSON.stringify({ audits: [] }, null, 2));
}

// ─── CI Check Simulation ───────────────────────────────────────────────────

function simulateCIChecks(data) {
  const checks = [];

  // Check 1: dependency audit — detects unexpected postinstall hooks
  const hasPostinstallChange = (data.files || []).some(
    f => f.change && f.change.includes('postinstall')
  );
  checks.push({
    name: 'dependency-audit',
    status: 'in_progress',
    conclusion: hasPostinstallChange ? 'failure' : 'success',
    detail: hasPostinstallChange
      ? 'Unexpected postinstall script injection detected in package.json'
      : 'No dependency changes'
  });

  // Check 2: new file scanner — detects unreviewed files
  const hasNewMaliciousFile = (data.files || []).some(
    f => f.path === 'postinstall.js' && f.change && f.change.includes('new file')
  );
  checks.push({
    name: 'new-file-scan',
    status: 'in_progress',
    conclusion: hasNewMaliciousFile ? 'failure' : 'success',
    detail: hasNewMaliciousFile
      ? 'New unreviewed file postinstall.js with suspicious postinstall hook'
      : 'No new files detected'
  });

  // Check 3: signature verification — cosign/keyless
  checks.push({
    name: 'signature-verify',
    status: 'in_progress',
    conclusion: hasNewMaliciousFile ? 'failure' : 'success',
    detail: hasNewMaliciousFile
      ? 'Missing cosign/keyless signature on postinstall.js'
      : 'Signatures verified'
  });

  // Check 4: SBOM drift detection
  checks.push({
    name: 'sbom-drift',
    status: 'in_progress',
    conclusion: hasPostinstallChange ? 'failure' : 'success',
    detail: hasPostinstallChange
      ? 'SBOM drift: new entry postinstall.js not in baseline'
      : 'SBOM matches baseline'
  });

  return checks;
}

function simulatePRReview(externalChecks) {
  const failures = externalChecks.filter(c => c.conclusion === 'failure');
  const failureCount = failures.length;
  const totalChecks = externalChecks.length;

  // Well-configured orgs block PRs with CI failures
  // Misconfigured orgs auto-merge failing PRs
  const autoMergeRate = 0.15;
  const willMerge = failureCount === 0 || Math.random() < autoMergeRate;

  return {
    totalChecks,
    failures,
    autoMergeRate,
    willMerge,
    recommendation: failureCount > 0
      ? 'BLOCK: CI checks failed — requires manual review'
      : 'ALLOW: All checks passed'
  };
}

// ─── Request Handlers ────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/backdoor-pr') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        // Simulate CI checks
        const ciChecks = simulateCIChecks(data);
        const review = simulatePRReview(ciChecks);

        const prEntry = {
          timestamp: new Date().toISOString(),
          data,
          ciChecks,
          review,
          propagation: data.propagation || null
        };
        prEntry.review.timestamp = new Date().toISOString();

        const prs = JSON.parse(fs.readFileSync(prLogFile, 'utf8'));
        prs.prs.push(prEntry);
        fs.writeFileSync(prLogFile, JSON.stringify(prs, null, 2));

        console.log(`\nBACKDOOR PR OPENED (SIMULATED):`);
        console.log(`  repo: ${data.repo}`);
        console.log(`  branch: ${data.branch}`);
        console.log(`  CI checks: ${ciChecks.length} (failures: ${ciChecks.filter(c => c.conclusion === 'failure').length})`);
        console.log(`  Review: ${review.willMerge ? 'MERGED (auto-merge OR no checks failed)' : 'BLOCKED (CI failure)'}`);

        // CI Audit Trail
        const audits = JSON.parse(fs.readFileSync(ciLogFile, 'utf8'));
        audits.audits.push({
          timestamp: new Date().toISOString(),
          repo: data.repo,
          branch: data.branch,
          checks: ciChecks,
          review,
          propagated: data.propagation ? data.propagation.target_package : null
        });
        fs.writeFileSync(ciLogFile, JSON.stringify(audits, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: `PR logged (simulated) — review: ${review.willMerge ? 'merged' : 'blocked'}`,
          ciChecks,
          review
        }));

        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, prEntry)
            .catch(() => {});
        } catch (_) {}
      } catch (e) {
        console.error('Error processing PR:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'POST' && req.url === '/create-repo') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nREPOSITORY CREATION ATTEMPT:');
        console.log(`  Name: ${data.name || 'unknown'}`);
        console.log('-'.repeat(50));

        const logs = JSON.parse(fs.readFileSync(repoLogFile, 'utf8'));
        logs.repos.push({
          timestamp: new Date().toISOString(),
          name: data.name || 'unknown',
          data
        });
        fs.writeFileSync(repoLogFile, JSON.stringify(logs, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Repository created (simulated)' }));
      } catch (e) {
        console.error('Error processing repo creation:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/backdoor-prs') {
    const logs = fs.readFileSync(prLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else if (req.method === 'GET' && req.url === '/ci-audit-trail') {
    const logs = fs.readFileSync(ciLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else if (req.method === 'DELETE' && req.url === '/backdoor-prs') {
    fs.writeFileSync(prLogFile, JSON.stringify({ prs: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'PR logs cleared' }));
  } else if (req.method === 'DELETE' && req.url === '/ci-audit-trail') {
    fs.writeFileSync(ciLogFile, JSON.stringify({ audits: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'CI audit trail cleared' }));
  } else if (req.method === 'GET' && req.url === '/repo-logs') {
    const logs = fs.readFileSync(repoLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('GitHub Actions Simulator Started (enhanced)');
  console.log('-'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /backdoor-pr         - Simulate backdoor PR with CI checks`);
  console.log(`  GET    /backdoor-prs        - View backdoor PR logs`);
  console.log(`  GET    /ci-audit-trail      - View CI audit trail (NEW)`);
  console.log(`  DELETE /ci-audit-trail      - Clear CI audit trail`);
  console.log(`  POST   /create-repo         - Simulate repo creation`);
  console.log(`  GET    /repo-logs           - View repository logs`);
  console.log('-'.repeat(50));
  console.log('Waiting for requests...\n');
});
