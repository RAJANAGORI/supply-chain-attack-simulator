/**
 * Editable SCAS landing content.
 * Change copy, CTAs, and section text here — sections read from this file only.
 */

export const site = {
  brand: 'SCAS',
  docsUrl: 'https://simulator.rajanagori.in',
  dashboardPort: '3100',

  nav: {
    docsLabel: 'Docs',
    dashboardLabel: 'Open Dashboard',
  },

  hero: {
    brand: 'SCAS',
    headline: 'Break the chain. Learn to defend it.',
    support:
      'Twenty-five localhost-only labs for modeling, detecting, and mitigating software supply chain attacks.',
    primaryCta: 'Start Dashboard',
    secondaryCta: 'Learn More',
    orbitLabel: 'localhost only',
  },

  scenarioTicker: [
    { id: '01', title: 'Typosquatting', level: 'Beginner' },
    { id: '02', title: 'Dependency Confusion', level: 'Beginner' },
    { id: '03', title: 'Compromised Package', level: 'Beginner' },
    { id: '04', title: 'Malicious Update', level: 'Intermediate' },
    { id: '05', title: 'Build Compromise', level: 'Advanced' },
    { id: '06', title: 'Shai-Hulud Worm', level: 'Advanced' },
    { id: '07', title: 'Transitive Dependency', level: 'Intermediate' },
    { id: '08', title: 'Lockfile Manipulation', level: 'Intermediate' },
    { id: '09', title: 'Signing Bypass', level: 'Advanced' },
    { id: '10', title: 'Git Submodule Attack', level: 'Intermediate' },
    { id: '11', title: 'Registry Mirror Poisoning', level: 'Advanced' },
    { id: '12', title: 'Workspace / Monorepo', level: 'Intermediate' },
    { id: '13', title: 'Metadata Manipulation', level: 'Intermediate' },
    { id: '14', title: 'Container Image Attack', level: 'Advanced' },
    { id: '15', title: 'Developer Tool Compromise', level: 'Advanced' },
    { id: '16', title: 'Cache Poisoning', level: 'Intermediate' },
    { id: '17', title: 'Multi-Stage Kill Chain', level: 'Advanced' },
    { id: '18', title: 'Package Manager Plugin', level: 'Advanced' },
    { id: '19', title: 'SBOM Manipulation', level: 'Advanced' },
    { id: '20', title: 'Version Confusion', level: 'Advanced' },
    { id: '21', title: 'Axios-style npm Release', level: 'Advanced' },
    { id: '22', title: 'LiteLLM-style PyPI', level: 'Advanced' },
    { id: '23', title: 'Trivy CI Compromise', level: 'Advanced' },
    { id: '24', title: 'Slopsquatting', level: 'Intermediate' },
    { id: '25', title: 'Compromised GitHub Action', level: 'Advanced' },
  ],

  killChain: {
    eyebrow: 'How you learn',
    headline: 'Attack. Detect. Mitigate.',
    support: 'Every lab walks the same loop — with real mechanics, gated for education.',
    verbs: ['Attack', 'Detect', 'Mitigate', 'Defend'],
    steps: [
      {
        title: 'Attack',
        body: 'Run intentionally malicious packages, mirrors, builds, and CI patterns — only when TESTBENCH_MODE is enabled.',
      },
      {
        title: 'Detect',
        body: 'Hunt IOCs with scanners, DETECT.md runbooks, Sigma/YARA examples, and optional Elasticsearch.',
      },
      {
        title: 'Mitigate',
        body: 'Apply lockfiles, pinning, scopes, SBOM checks, and hardening playbooks that map to production policy.',
      },
    ],
  },

  safety: {
    eyebrow: 'Safety model',
    headline: 'Gated payloads. Localhost only.',
    support:
      'Malicious paths never run unless TESTBENCH_MODE is enabled — and exfiltration targets 127.0.0.1 only.',
    shimmerText: 'TESTBENCH_MODE=enabled',
    dialogTitle: 'How the gate works',
    dialogBody:
      'Every scenario setup sources enable-testbench.sh. Payloads check process.env.TESTBENCH_MODE (or Python equivalent) before any malicious path. Without the flag, code prints [SAFE MODE] and exits. Captures stay on localhost mock collectors — never external hosts.',
  },

  stats: {
    eyebrow: 'Built for workshops',
    headline: 'A full test bench, not a slide deck.',
    items: [
      { value: 25, label: 'Attack labs', suffix: '' },
      { value: 3, label: 'Optional tracks', suffix: '' },
      { value: 1, label: 'Safety gate', suffix: '' },
    ],
    tiles: [
      {
        title: 'CLI-first',
        body: 'Every lab runs from the terminal. The dashboard is optional.',
      },
      {
        title: 'Blue-team ready',
        body: 'Per-scenario DETECT.md with IOCs, Sigma, YARA, and mitigations.',
      },
      {
        title: 'Cloud track',
        body: 'Optional Floci local-AWS dual-write for S3/ECR-style evidence.',
      },
    ],
  },

  tracks: {
    eyebrow: 'Optional tracks',
    headline: 'Observe and extend when you need them.',
    items: [
      { title: 'Elasticsearch + Kibana', body: 'Index runbooks and live captures for SIEM-style review.' },
      { title: 'Floci local AWS', body: 'Mirror exfil into a local emulator on :4566 — no real cloud account.' },
      { title: 'Control Center UI', body: 'Drive labs from the browser with live logs and platform controls.' },
    ],
  },

  finalCta: {
    headline: 'Open the Control Center.',
    support: 'Prepare labs, stream output, and inspect captures — still localhost-only.',
    primaryCta: 'Start Dashboard',
    secondaryCta: 'Read the docs',
  },

  footer: {
    note: 'Educational use in isolated environments only. © Raja Nagori · SCAS',
  },
} as const;

export type SiteContent = typeof site;
