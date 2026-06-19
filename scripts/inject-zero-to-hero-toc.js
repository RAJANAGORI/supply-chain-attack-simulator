#!/usr/bin/env node
'use strict';
/**
 * @deprecated Use: node scripts/inject-markdown-toc.js zero-to-hero
 */
const { spawnSync } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'inject-markdown-toc.js');
const result = spawnSync(process.execPath, [script, 'zero-to-hero'], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
