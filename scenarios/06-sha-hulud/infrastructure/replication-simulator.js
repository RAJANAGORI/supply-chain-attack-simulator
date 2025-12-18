/**
 * Replication Simulator
 * Simulates how stolen credentials are used to compromise more packages
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const credentialsFile = path.join(__dirname, 'captured-credentials.json');
const replicationLogFile = path.join(__dirname, 'replication-logs.json');

// Initialize replication log
if (!fs.existsSync(replicationLogFile)) {
  fs.writeFileSync(replicationLogFile, JSON.stringify({ replications: [] }, null, 2));
}

function simulateReplication() {
  console.log('\n🔄 [REPLICATION SIM] Starting self-replication simulation...');
  console.log('─'.repeat(50));
  
  // Check if credentials were captured
  if (!fs.existsSync(credentialsFile)) {
    console.log('⚠️  No credentials found. Run the attack first to capture credentials.');
    return;
  }
  
  const credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
  
  if (credentials.captures.length === 0) {
    console.log('⚠️  No credentials captured yet. Install the compromised package first.');
    return;
  }
  
  console.log(`📋 Found ${credentials.captures.length} credential capture(s)`);
  console.log('');
  
  // Simulate packages that would be compromised
  const simulatedPackages = [
    'data-processor',
    'utils-helper',
    'api-client',
    'auth-lib',
    'config-manager'
  ];
  
  console.log('🎯 Simulating package compromise using stolen credentials:');
  console.log('');
  
  const replications = JSON.parse(fs.readFileSync(replicationLogFile, 'utf8'));
  
  simulatedPackages.forEach((pkgName, index) => {
    const replication = {
      timestamp: new Date().toISOString(),
      package: pkgName,
      version: `1.2.${index + 1}`,
      method: 'stolen_npm_token',
      status: 'compromised',
      note: 'Malicious postinstall script injected'
    };
    
    replications.replications.push(replication);
    
    console.log(`  ${index + 1}. ${pkgName}@${replication.version} - COMPROMISED`);
  });
  
  fs.writeFileSync(replicationLogFile, JSON.stringify(replications, null, 2));
  
  console.log('');
  console.log('='.repeat(50));
  console.log('⚠️  SELF-REPLICATION COMPLETE');
  console.log('='.repeat(50));
  console.log('');
  console.log(`📦 ${simulatedPackages.length} packages compromised`);
  console.log('🔄 Attack has spread automatically');
  console.log('💥 Each compromised package will harvest more credentials');
  console.log('🌊 Attack propagates across the ecosystem');
  console.log('');
  console.log('This demonstrates why Shai-Hulud is so dangerous:');
  console.log('  - One compromise leads to many');
  console.log('  - Spreads automatically');
  console.log('  - Difficult to contain');
  console.log('  - Affects entire ecosystems');
  console.log('');
}

// Create HTTP server for API access
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/simulate') {
    simulateReplication();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Replication simulated' }));
  } else if (req.method === 'GET' && req.url === '/logs') {
    const logs = fs.readFileSync(replicationLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Run simulation if called directly
if (require.main === module) {
  simulateReplication();
} else {
  server.listen(PORT, () => {
    console.log('🔄 Replication Simulator Started');
    console.log('─'.repeat(50));
    console.log(`Listening on http://localhost:${PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET    /simulate  - Run replication simulation`);
    console.log(`  GET    /logs      - View replication logs`);
    console.log('─'.repeat(50));
    console.log('');
  });
}

