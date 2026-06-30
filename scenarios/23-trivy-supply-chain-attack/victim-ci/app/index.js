/**
 * Victim Application — Scenario 23: Trivy Supply Chain Attack
 * A simple Express-like web service used as the CI scan target.
 * This is the application that the "CI pipeline" would scan.
 */

'use strict';

function createApp() {
    return {
        name: 'acme-payments-api',
        version: '2.4.1',
        routes: ['/health', '/api/v1/payments', '/api/v1/users'],
        dependencies: {
            'example-dep': '1.2.3',  // has CVE-2024-12345 (intentional for scan demo)
        },
    };
}

module.exports = { createApp };

if (require.main === module) {
    const app = createApp();
    console.log(`App: ${app.name} v${app.version}`);
    console.log(`Routes: ${app.routes.join(', ')}`);
}
