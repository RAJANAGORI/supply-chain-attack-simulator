#!/usr/bin/env node

/**
 * Plugin Attack Detector (Scenario 18)
 * Flags evidence of plugin-based injection/exfiltration patterns.
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'victim-app';
const root = path.isAbsolute(target) ? target : path.join(process.cwd(), target);

const pluginHookPath = path.join(root, 'plugins', 'malicious-plugin', 'index.js');
const activePluginPath = path.join(root, 'plugin-active.js');
const markerPath = path.join(root, 'node_modules', 'target-lib', '.infected-by-plugin');

function read(p) {
  try {
    if (!fs.existsSync(p)) return '';
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

const hook = read(pluginHookPath);
const active = read(activePluginPath);
const markerExists = fs.existsSync(markerPath);
const exfilFound = hook.includes('localhost') && hook.includes(':3018') ? true : false;

console.log('🔍 Plugin Attack Detector (Scenario 18)\n');

if (markerExists || exfilFound || hook.includes('installHook')) {
  console.log('🚨 Potential plugin compromise detected.');
  if (markerExists) console.log('- Found injection marker: .infected-by-plugin');
  if (exfilFound) console.log('- Found exfiltration endpoint: localhost:3018');
  console.log('\nMitigation: isolate build tools, verify plugins, and enforce allowlisted installation paths.');
  process.exit(2);
}

console.log('✅ No obvious plugin compromise indicators found.');
console.log('Mitigation: still review plugin hooks and disable unknown scripts.');
process.exit(0);

