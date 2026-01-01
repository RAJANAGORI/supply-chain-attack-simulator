/**
 * COMPROMISED PROJECT
 * Project with malicious git submodule
 */

const express = require('express');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Awesome Project Running',
    status: 'COMPROMISED',
    warning: 'This project contains a malicious submodule!',
    submodules: ['legitimate-lib', 'malicious-submodule']
  });
});

app.listen(PORT, () => {
  console.log(`🚨 Compromised Project running on http://localhost:${PORT}`);
  console.log('⚠️  WARNING: This project contains a malicious submodule!');
  console.log('📦 Submodules: legitimate-lib, malicious-submodule');
  console.log('');
  console.log('Check captured data:');
  console.log('  curl http://localhost:3000/captured-data');
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates git submodule attack:
//
// 1. Legitimate repository includes malicious submodule
// 2. Submodule contains postinstall script
// 3. When repository is cloned or submodules updated, script executes
// 4. Malicious code runs automatically
// 5. System compromise occurs
//
// Why this is dangerous:
// - Submodules execute automatically during clone/update
// - Can be overlooked in code reviews
// - Affects all repository users
// - Trust chain extends to submodules
//
// Detection:
// - Review .gitmodules file
// - Check submodule URLs
// - Validate submodule content
// - Monitor submodule execution
// ============================================================================

