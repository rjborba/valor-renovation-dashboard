const createConfig = require('../../config/rspack.cjs');

module.exports = createConfig(__dirname, 3000, {
  name: 'dashboard',
  shareStrategy: 'loaded-first',
  remotes: {
    expenses: 'expenses@http://localhost:3001/mf-manifest.json',
    reports: 'reports@http://localhost:3002/mf-manifest.json',
  },
});
