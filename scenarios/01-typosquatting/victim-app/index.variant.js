/**
 * VICTIM APPLICATION - variant entry for the purple-team reversal round 2.
 *
 * Same app, but the attacker republished under a new package name. The control
 * plane generates the package under .scas-variant/ and exports its name in
 * SCAS_VARIANT_PACKAGE (plus NODE_PATH so require() finds it).
 * Only used by POST /scenarios/01/reversal.
 */
const name = process.env.SCAS_VARIANT_PACKAGE;
if (!name) {
  console.error('SCAS_VARIANT_PACKAGE is not set. This entry is driven by the reversal flow.');
  process.exit(2);
}

console.log(`Starting victim application (dependency: ${name})...\n`);
const lib = require(name);
console.log('Dependency loaded:', typeof lib.get === 'function' ? 'ok' : 'unexpected shape');
