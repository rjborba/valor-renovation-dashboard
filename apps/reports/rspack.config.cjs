const createConfig = require('../../config/rspack.cjs');

module.exports = createConfig(__dirname, 3002, {
  name: 'reports',
  exposes: {
    './ReportsFeature': './src/ReportsFeature.tsx',
  },
});
