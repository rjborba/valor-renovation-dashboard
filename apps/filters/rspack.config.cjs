const createConfig = require('../../config/rspack.cjs');

module.exports = createConfig(__dirname, 3003, {
  name: 'filters',
  exposes: {
    './FiltersFeature': './src/FiltersFeature.tsx',
  },
});
