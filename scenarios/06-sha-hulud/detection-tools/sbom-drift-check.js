#!/usr/bin/env node
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
 * SBOM Drift Checker for Shai-Hulud Scenario
 *
 * Simulates detection of SBOM (Software Bill of Materials) drift — the
 * difference between the known-good SBOM baseline and the actual dependencies
 * after a package-lock.json propagation attack.
 *
 * Usage:
 *   node sbom-drift-check.js [project-root]
 */

require('../infrastructure/scenario-provenance');

const fs = require('fs');
const path = require('path');

// ─── Defaults ────────────────────────────────────────────────────────────────

const projectRoot = process.argv[2] || process.cwd();
const driftLogFile = path.join(__dirname, 'sbom-drift.json');

// ─── Baseline (known-good state before attack) ──────────────────────────────

function getBaseline() {
  return {
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    packages: {
      '@victim-org/victim-utils': { version: '1.0.0', integrity: 'sha256-baseline-utils-001' },
      '@victim-org/victim-api': { version: '2.1.0', integrity: 'sha256-baseline-api-210' },
      '@victim-org/victim-logger': { version: '0.5.2', integrity: 'sha256-baseline-logger-052' },
      '@victim-org/victim-auth': { version: '3.2.1', integrity: 'sha256-baseline-auth-321' },
      'shai-hulud': { version: '1.0.0', integrity: 'sha256-baseline-shai-001', classified: 'LEGITIMATE' }
    }
  };
}

// ─── Current State (from mock registry) ──────────────────────────────────────

function getCurrentState(registryFile) {
  try {
    const registryData = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
    return registryData.packages || {};
  } catch (_) {
    return {};
  }
}

// ─── Drift Detection ─────────────────────────────────────────────────────────

function detectDrift(baseline, current) {
  const drifts = [];
  const baselineNames = new Set(Object.keys(baseline.packages));
  const currentNames = new Set(Object.keys(current));

  // Check for version changes
  for (const name of baselineNames) {
    if (!currentNames.has(name)) {
      drifts.push({
        type: 'removed',
        package: name,
        baseline: baseline.packages[name],
        current: null,
        severity: 'critical'
      });
      continue;
    }

    const baseVer = baseline.packages[name].version;
    const currVer = current[name].version;

    if (baseVer !== currVer) {
      drifts.push({
        type: 'version_changed',
        package: name,
        baseline: baseVer,
        current: currVer,
        severity: currVer !== baseVer ? 'critical' : 'low',
        detail: `${name}: ${baseVer} → ${currVer}`
      });
    }

    // Check for injected scripts
    if (current[name].scripts && current[name].scripts.postinstall) {
      drifts.push({
        type: 'injected_script',
        package: name,
        script: current[name].scripts.postinstall,
        severity: 'critical',
        detail: `New postinstall script detected: ${current[name].scripts.postinstall}`
      });
    }
  }

  // Check for new packages (worm propagation targets)
  for (const name of currentNames) {
    if (!baselineNames.has(name)) {
      drifts.push({
        type: 'new_package',
        package: name,
        current: current[name],
        severity: 'critical',
        detail: 'Unknown package not in SBOM baseline'
      });
    }
  }

  return drifts;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function run() {
  console.log('SBOM Drift Checker — Shai-Hulud Scenario');
  console.log('='.repeat(50));
  console.log('');

  const baseline = getBaseline();
  console.log(`Baseline loaded: ${Object.keys(baseline.packages).length} packages`);

  // Read current state from mock registry
  const registryFile = path.join(projectRoot, 'infrastructure', 'registry-db.json');
  const current = getCurrentState(registryFile);
  console.log(`Current state: ${Object.keys(current).length} packages`);

  // Detect drift
  const drifts = detectDrift(baseline, current);

  if (drifts.length === 0) {
    console.log('\n✓ No drift detected — SBOM matches baseline');
  } else {
    console.log(`\n⚠️  ${drifts.length} drift(s) detected:\n`);

    drifts.forEach((d, i) => {
      const icon = d.severity === 'critical' ? '🔴' : '🟡';
      console.log(`  ${icon} #${i + 1} [${d.severity.toUpperCase()}] ${d.type}`);
      console.log(`      Package: ${d.package}`);
      if (d.baseline) console.log(`      Baseline: ${d.baseline.version || d.baseline}`);
      if (d.current) console.log(`      Current:  ${d.current.version || d.current}`);
      if (d.detail) console.log(`      Detail:   ${d.detail}`);
      console.log('');
    });

    // Save drift report
    const report = {
      timestamp: new Date().toISOString(),
      baseline,
      current,
      drifts,
      summary: {
        totalDrifts: drifts.length,
        critical: drifts.filter(d => d.severity === 'critical').length,
        high: drifts.filter(d => d.severity === 'high').length,
        medium: drifts.filter(d => d.severity === 'medium').length,
        low: drifts.filter(d => d.severity === 'low').length
      }
    };

    fs.writeFileSync(driftLogFile, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${driftLogFile}`);
  }
}

try {
  run();
} catch (e) {
  console.error('[sbom-drift-check] Error:', e.message);
}
