import assert from 'node:assert/strict';
import { platformHost } from './platform-probe.js';

assert.equal(platformHost(), process.env.SCAS_PLATFORM_HOST || '127.0.0.1');

process.env.SCAS_PLATFORM_HOST = '0.0.0.0';
assert.equal(platformHost(), '127.0.0.1');

process.env.SCAS_PLATFORM_HOST = '::';
assert.equal(platformHost(), '127.0.0.1');

process.env.SCAS_PLATFORM_HOST = 'host.docker.internal';
assert.equal(platformHost(), 'host.docker.internal');

delete process.env.SCAS_PLATFORM_HOST;
console.log('platform-probe host checks ok');
