import assert from 'node:assert/strict';
import { applyEnvFile, expandEnvValue } from './env.js';

const base: Record<string, string> = { EXISTING: 'keep' };

applyEnvFile(
  [
    '# comment',
    'export TESTBENCH_MODE=enabled',
    'export SCAS_FLOCI_ENABLED=1',
    'export SCAS_FLOCI_ENDPOINT=http://127.0.0.1:4566',
    'export SCAS_ES_URL="${SCAS_ES_URL:-http://127.0.0.1:9200}"',
    'export KIBANA_URL="${KIBANA_URL:-http://127.0.0.1:5601}"',
    'if [ -f "x" ]; then',
    '  source y',
    'fi',
    'unset _SCAS_ROOT',
    '_SCAS_ROOT="$(cd . && pwd)"',
    'PLAIN=ok',
  ].join('\n'),
  base,
);

assert.equal(base.TESTBENCH_MODE, 'enabled');
assert.equal(base.SCAS_FLOCI_ENABLED, '1');
assert.equal(base.SCAS_FLOCI_ENDPOINT, 'http://127.0.0.1:4566');
assert.equal(base.SCAS_ES_URL, 'http://127.0.0.1:9200');
assert.equal(base.KIBANA_URL, 'http://127.0.0.1:5601');
assert.equal(base.PLAIN, 'ok');
assert.equal(base.EXISTING, 'keep');
assert.equal(base['export SCAS_FLOCI_ENABLED'], undefined);
assert.equal(base._SCAS_ROOT, undefined);

assert.equal(
  expandEnvValue('${SCAS_ES_URL:-http://127.0.0.1:9200}', { SCAS_ES_URL: 'http://custom:9200' }),
  'http://custom:9200',
);
assert.equal(expandEnvValue('${MISSING:-fallback}', {}), 'fallback');

console.log('env parse checks ok');
