/**
 * VULNERABLE NODE.JS APPLICATION
 * 
 * This application demonstrates various supply chain vulnerabilities:
 * - Outdated dependencies
 * - No package-lock.json enforcement
 * - Lack of security scanning
 * - Sensitive data in environment
 * 
 * FOR EDUCATIONAL PURPOSES ONLY
 */

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simulated sensitive configuration
const config = {
  apiKey: process.env.API_KEY || 'sk_live_demo_key_12345',
  databaseUrl: process.env.DATABASE_URL || 'mongodb://admin:password@localhost:27017/myapp',
  secretKey: process.env.SECRET_KEY || 'super-secret-jwt-key',
  awsAccessKey: process.env.AWS_ACCESS_KEY || 'AKIAIOSFODNN7EXAMPLE',
  awsSecretKey: process.env.AWS_SECRET_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
};

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Vulnerable App</title></head>
      <body style="font-family: Arial; padding: 40px; background: #f0f0f0;">
        <h1>🔓 Vulnerable Node.js Application</h1>
        <p>This application is intentionally vulnerable for educational purposes.</p>
        
        <h2>Vulnerabilities:</h2>
        <ul>
          <li>No package-lock.json enforcement</li>
          <li>Outdated dependencies</li>
          <li>Sensitive data in environment variables</li>
          <li>No security headers</li>
          <li>No input validation</li>
        </ul>
        
        <h2>API Endpoints:</h2>
        <ul>
          <li>GET /api/config - View configuration (⚠️ Exposes secrets)</li>
          <li>POST /api/validate - Validate user input</li>
          <li>POST /api/login - User authentication</li>
        </ul>
        
        <p><strong>Note:</strong> If a malicious package is installed, it can access all this data!</p>
      </body>
    </html>
  `);
});

// VULNERABLE: Exposes sensitive configuration
app.get('/api/config', (req, res) => {
  console.log('⚠️  Warning: Exposing sensitive configuration');
  res.json({
    message: 'Application configuration',
    config: config  // This would be accessed by malicious packages!
  });
});

// VULNERABLE: No input validation
app.post('/api/validate', (req, res) => {
  const { email, password } = req.body;
  
  // If we're using a compromised validation library, this data gets exfiltrated!
  console.log('Validating user input:', { email, password });
  
  res.json({
    valid: true,
    message: 'Input validated (insecurely)'
  });
});

// VULNERABLE: Weak authentication
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simulated authentication - credentials could be captured by malicious packages
  if (username && password) {
    const token = Buffer.from(`${username}:${password}:${config.secretKey}`).toString('base64');
    
    res.json({
      success: true,
      token: token,
      message: 'Authenticated successfully'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🔓 VULNERABLE APPLICATION STARTED');
  console.log('='.repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('⚠️  WARNING: This application is intentionally vulnerable!');
  console.log('');
  console.log('Supply Chain Attack Surface:');
  console.log(`  - ${Object.keys(require('./package.json').dependencies || {}).length} direct dependencies`);
  console.log('  - No package integrity verification');
  console.log('  - Sensitive data in memory');
  console.log('  - No security scanning enabled');
  console.log('');
  console.log('If a malicious package is installed, it can:');
  console.log('  ✗ Access all environment variables');
  console.log('  ✗ Capture API keys and secrets');
  console.log('  ✗ Intercept user credentials');
  console.log('  ✗ Exfiltrate data to external servers');
  console.log('  ✗ Establish persistence mechanisms');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;

// ============================================================================
// LEARNING NOTES:
// ============================================================================
//
// This application demonstrates real-world vulnerabilities in Node.js apps:
//
// 1. DEPENDENCY MANAGEMENT:
//    - No package-lock.json enforcement (npm install vs npm ci)
//    - Outdated dependencies with known vulnerabilities
//    - No automated dependency updates
//
// 2. SECRETS MANAGEMENT:
//    - Hardcoded default secrets (bad practice)
//    - Environment variables accessible to all packages
//    - No secrets encryption or vault usage
//
// 3. INPUT VALIDATION:
//    - No validation before processing
//    - Trusting user input
//    - Using vulnerable validation libraries
//
// 4. AUTHENTICATION:
//    - Weak token generation
//    - No rate limiting
//    - Credentials logged (accessible to malicious packages)
//
// 5. SUPPLY CHAIN RISKS:
//    - Any installed package can access all this data
//    - No runtime monitoring
//    - No integrity verification
//    - No security scanning in CI/CD
//
// ============================================================================

