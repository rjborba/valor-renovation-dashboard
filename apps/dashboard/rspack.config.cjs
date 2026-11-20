const createConfig = require('../../config/rspack.cjs');

module.exports = (env) => {
  const port = Number(env?.dashboardPort ?? 3000);
  return createConfig(__dirname, port, {
    name: 'dashboard',
    shareStrategy: 'loaded-first',
    remotes: {
      tasks: `tasks@http://localhost:${port + 1}/mf-manifest.json`,
      filters: `filters@http://localhost:${port + 3}/mf-manifest.json`,
      reports: `reports@http://localhost:${port + 2}/mf-manifest.json`,
    },
  })(env);
};
