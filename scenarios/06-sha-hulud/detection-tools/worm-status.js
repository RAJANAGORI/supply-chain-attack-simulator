#!/usr/bin/env node
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
 * Worm Propagation Status Dashboard
 *
 * Aggregates telemetry from all mock infrastructure servers to show the
 * current state of the Shai-Hulud worm propagation in real time.
 *
 * Usage:
 *   node worm-status.js [project-root]
 */

require('../infrastructure/scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || process.cwd();

// ─── Infrastructure Endpoints ────────────────────────────────────────────────

const ENDPOINTS = {
  harvester: 'http://127.0.0.1:3001',
  github: 'http://127.0.0.1:3002',
  registry: 'http://127.0.0.1:3003',
  network: 'http://127.0.0.1:3005'
};

// ─── Data Fetching ───────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          resolve({});
        }
      });
    }).on('error', () => resolve(null));
  });
}

// ─── Status Computation ──────────────────────────────────────────────────────

function computeStatus(data) {
  const {
    published,
    prs,
    ciAudit,
    networkEvents
  } = data;

  // Count metrics
  const totalPublishes = published ? published.publishes.length : 0;
  const totalPRs = prs ? prs.prs.length : 0;
  const totalPRFailures = (prs && prs.prs)
    ? prs.prs.filter(pr => pr.review && pr.review.willMerge).length
    : 0;
  const totalPRBlocked = totalPRs - totalPRFailures;
  const totalCIChecks = ciAudit ? ciAudit.audits.length : 0;
  const totalNetworkEvents = networkEvents ? networkEvents.events.length : 0;
  const totalSuspicious = networkEvents
    ? networkEvents.events.filter(e => e.suspicious).length
    : 0;

  // Infected packages list
  const infectedPackages = new Set();
  if (published && published.publishes) {
    published.publishes.forEach(p => {
      if (p.data.package) infectedPackages.add(p.data.package);
    });
  }

  // Propagation chain
  const propagationChain = [];
  if (published && published.publishes) {
    published.publishes.forEach(p => {
      if (p.data.propagation) {
        propagationChain.push({
          package: p.data.package,
          version: p.data.version,
          method: p.data.propagation.method,
          source: p.data.propagation.source,
          timestamp: p.timestamp
        });
      }
    });
  }

  return {
    summary: {
      totalPublishes,
      totalPRs,
      totalPRFailures,
      totalPRBlocked,
      totalCIChecks,
      totalNetworkEvents,
      totalSuspicious,
      infectedPackageCount: infectedPackages.size
    },
    infectedPackages: Array.from(infectedPackages),
    propagationChain,
    threatLevel: computeThreatLevel({
      totalPublishes,
      totalPRFailures,
      totalSuspicious
    }),
    recommendations: generateRecommendations(data)
  };
}

function computeThreatLevel(metrics) {
  const score = (metrics.totalPublishes * 2) + (metrics.totalPRFailures * 3) + (metrics.totalSuspicious * 1);
  if (score >= 10) return { level: 'CRITICAL', color: '#ff0000', icon: '🔴' };
  if (score >= 5) return { level: 'HIGH', color: '#ff8800', icon: '🟠' };
  if (score >= 2) return { level: 'MEDIUM', color: '#ffcc00', icon: '🟡' };
  return { level: 'LOW', color: '#00cc00', icon: '🟢' };
}

function generateRecommendations(data) {
  const recs = [];
  const { published, prs, ciAudit } = data;

  if (published && published.publishes && published.publishes.length > 0) {
    recs.push('🔍 Run sbom-drift-check.js to identify version changes');
    recs.push('🔒 Enforce package-lock.json integrity in CI');
    recs.push('🚫 Revoke compromised npm tokens immediately');
  }

  if (prs && prs.prs && prs.prs.some(pr => pr.review && pr.review.willMerge)) {
    recs.push('⛔ Block PRs that bypass required CI checks');
    recs.push('🔑 Enforce code review for all package.json changes');
  }

  if (ciAudit && ciAudit.audits) {
    const failures = ciAudit.audits.filter(a => a.review && a.review.failures && a.review.failures.length > 0);
    if (failures.length > 0) {
      recs.push(`🛡️ ${failures.length} PR(s) with CI failures were merged — investigate`);
    }
  }

  if (recs.length === 0) {
    recs.push('✓ No immediate threats detected');
    recs.push('📋 Continue monitoring for new propagation attempts');
  }

  return recs;
}

// ─── Output ──────────────────────────────────────────────────────────────────

function printDashboard(status) {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  SHAI-HULUD WORM STATUS DASHBOARD                       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  const tl = status.threatLevel;
  console.log(`║  Threat Level: ${tl.icon} ${tl.level.padEnd(42)}║`);
  console.log('╠══════════════════════════════════════════════════════════╣');

  const s = status.summary;
  console.log(`║  Published:     ${String(s.totalPublishes).padEnd(42)}║`);
  console.log(`║  Packages In.:  ${String(s.infectedPackageCount).padEnd(42)}║`);
  console.log(`║  PRs Opened:    ${String(s.totalPRs).padEnd(42)}║`);
  console.log(`║  PRs Merged:    ${String(s.totalPRFailures).padEnd(42)}║`);
  console.log(`║  PRs Blocked:   ${String(s.totalPRBlocked).padEnd(42)}║`);
  console.log(`║  CI Checks:     ${String(s.totalCIChecks).padEnd(42)}║`);
  console.log(`║  Net Events:    ${String(s.totalNetworkEvents).padEnd(42)}║`);
  console.log(`║  Suspicious:    ${String(s.totalSuspicious).padEnd(42)}║`);
  console.log('╠══════════════════════════════════════════════════════════╣');

  if (status.infectedPackages.length > 0) {
    console.log('║  INFECTED PACKAGES:');
    status.infectedPackages.forEach(pkg => {
      console.log(`║    → ${pkg.padEnd(44)}║`);
    });
  }

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  RECOMMENDATIONS:');
  status.recommendations.forEach(rec => {
    console.log(`║    ${rec.padEnd(44)}║`);
  });
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Worm Status Dashboard — Shai-Hulud Scenario');
  console.log('='.repeat(50));

  // Fetch all infrastructure logs
  const [published, prs, ciAudit, networkEvents] = await Promise.all([
    fetchJSON(`${ENDPOINTS.registry}/published-packages`),
    fetchJSON(`${ENDPOINTS.github}/backdoor-prs`),
    fetchJSON(`${ENDPOINTS.github}/ci-audit-trail`),
    fetchJSON(`${ENDPOINTS.network}/network-log`)
  ]);

  const status = computeStatus({ published, prs, ciAudit, networkEvents });
  printDashboard(status);

  // Save report
  const reportFile = path.join(__dirname, 'worm-status-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(status, null, 2));
  console.log(`Report saved to: ${reportFile}`);
}

try {
  run();
} catch (e) {
  console.error('[worm-status] Error:', e.message);
  console.log('\n(Ensure all infrastructure services are running: setup.sh)');
}
