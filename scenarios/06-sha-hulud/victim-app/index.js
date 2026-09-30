/**
 * VICTIM APPLICATION
 * Installs `shai-hulud` and depends on the internally maintained `victim-utils`.
 */

const ShaiHulud = require('shai-hulud');
const VictimUtils = require('victim-utils');

console.log('Starting victim application...');
console.log(ShaiHulud.format('dependency loaded'));
console.log(VictimUtils.greet('developer'));
console.log('If TESTBENCH_MODE is enabled, the postinstall script has already run.');
console.log('Check the credential harvester, mock registry, and GitHub simulator for evidence.');
