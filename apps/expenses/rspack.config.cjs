const createConfig = require('../../config/rspack.cjs');

module.exports = createConfig(__dirname, 3001, {
  name: 'expenses',
  exposes: {
    './ExpensesFeature': './src/ExpensesFeature.tsx',
  },
});
