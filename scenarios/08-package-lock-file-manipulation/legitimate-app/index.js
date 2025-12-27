/**
 * LEGITIMATE APPLICATION
 * Clean application with legitimate dependencies
 */

const express = require('express');
const _ = require('lodash');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  const data = [1, 2, 3, 4, 5];
  const doubled = _.map(data, x => x * 2);
  
  res.json({
    message: 'Legitimate application running',
    data: doubled,
    dependencies: {
      express: require('express/package.json').version,
      lodash: require('lodash/package.json').version
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Legitimate app running on http://localhost:${PORT}`);
  console.log('📦 Dependencies: express, lodash');
});

