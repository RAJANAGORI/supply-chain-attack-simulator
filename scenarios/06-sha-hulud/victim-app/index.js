/**
 * VICTIM APPLICATION
 * Installs `shai-hulud` and depends on @victim-org/* internal packages.
 */

const ShaiHulud = require('shai-hulud');
const VictimUtils = require('@victim-org/victim-utils');
const VictimApi = require('@victim-org/victim-api');
const VictimLogger = require('@victim-org/victim-logger');
const VictimAuth = require('@victim-org/victim-auth');

console.log('Starting victim application...');
console.log(ShaiHulud.format('dependency loaded'));
console.log(VictimUtils.greet('developer'));
console.log(VictimUtils.sha256('hello'));
console.log(VictimApi.get('/health'));
console.log(VictimLogger.log('system', 'app started'));
console.log(VictimAuth.protect('admin'));
console.log('If TESTBENCH_MODE is enabled, the postinstall script has already run.');
console.log('Check the credential harvester, mock registry, and GitHub simulator for evidence.');
