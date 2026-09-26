#!/usr/bin/env node
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori - Supply Chain Attack Simulator
 * Scenario 5: GitHub Actions workflow injection scanner
 *
 * Scans a target directory (usually victim-app) for workflow/action IOCs:
 *   - mutable action tags (uses: owner/action@vN without a SHA)
 *   - secrets passed into action steps via env
 *   - action entrypoints that reference TESTBENCH_MODE, localhost, or process.env
 *
 * Usage:
 *   node detection-tools/workflow-injection-scanner.js victim-app
 */

'use strict';

const fs = require('fs');
const path = require('path');

function scanFile(filePath, patterns) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, idx) => {
    patterns.forEach(({ pattern, name }) => {
      if (pattern.test(line)) {
        findings.push({ line: idx + 1, name, text: line.trim() });
      }
    });
  });

  return findings;
}

function scanDirectory(targetPath) {
  const workflowsDir = path.join(targetPath, '.github', 'workflows');
  const actionsDir = path.join(targetPath, '.github', 'actions');

  const workflowPatterns = [
    { pattern: /^\s*-?\s*uses:\s*[^@\s]+@[^\s]+$/, name: 'Action reference' },
    { pattern: /^\s*-?\s*uses:\s*[^@\s]+@v\d+\.?\d*$/, name: 'MUTABLE TAG - action pinned to a version tag' },
    { pattern: /^\s*-?\s*uses:\s*[^@\s]+@[0-9a-f]{7,40}$/, name: 'Action pinned to SHA' },
    { pattern: /^\s*env:\s*$/, name: 'Environment block' },
    { pattern: /GITHUB_TOKEN|secrets\./, name: 'Secret referenced in workflow' }
  ];

  const actionJsPatterns = [
    { pattern: /TESTBENCH_MODE/, name: 'TESTBENCH_MODE gate' },
    { pattern: /127\.0\.0\.1|localhost/, name: 'Localhost reference' },
    { pattern: /process\.env/, name: 'Environment variable access' },
    { pattern: /http\.request|https\.request|fetch\(/, name: 'Outbound HTTP request' }
  ];

  let findings = [];

  if (fs.existsSync(workflowsDir)) {
    fs.readdirSync(workflowsDir).forEach((file) => {
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
        return;
      }
      const filePath = path.join(workflowsDir, file);
      const fileFindings = scanFile(filePath, workflowPatterns);
      if (fileFindings.length > 0) {
        findings.push({ file: filePath, items: fileFindings });
      }
    });
  }

  if (fs.existsSync(actionsDir)) {
    fs.readdirSync(actionsDir).forEach((action) => {
      const actionPath = path.join(actionsDir, action);
      const mainFile = path.join(actionPath, 'index.js');
      if (fs.existsSync(mainFile)) {
        const fileFindings = scanFile(mainFile, actionJsPatterns);
        if (fileFindings.length > 0) {
          findings.push({ file: mainFile, items: fileFindings });
        }
      }
    });
  }

  // Also scan a sibling malicious-action/ directory if the caller points at the scenario root.
  const siblingMalicious = path.join(path.dirname(targetPath), 'malicious-action', 'index.js');
  if (fs.existsSync(siblingMalicious)) {
    const fileFindings = scanFile(siblingMalicious, actionJsPatterns);
    if (fileFindings.length > 0) {
      findings.push({ file: siblingMalicious, items: fileFindings });
    }
  }

  console.log(`Scanning: ${targetPath}\n`);

  if (findings.length === 0) {
    console.log('No obvious workflow injection IOCs detected.');
    return;
  }

  findings.forEach(({ file, items }) => {
    console.log(`File: ${file}`);
    items.forEach((item) => {
      console.log(`  line ${item.line}: ${item.name}`);
      console.log(`    ${item.text}`);
    });
    console.log('');
  });

  console.log('-'.repeat(60));
  console.log('Suspicious activity detected: review mutable tags and secret exposure.');
}

const target = process.argv[2] || path.join(__dirname, '..', 'victim-app');
scanDirectory(target);
