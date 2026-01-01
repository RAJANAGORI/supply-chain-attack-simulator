/**
 * LEGITIMATE PROJECT
 * Clean project with legitimate submodule
 */

const express = require('express');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Awesome Project Running',
    status: 'OK',
    submodules: ['legitimate-lib']
  });
});

app.listen(PORT, () => {
  console.log(`✅ Awesome Project running on http://localhost:${PORT}`);
  console.log('📦 Using legitimate submodule: legitimate-lib');
});

