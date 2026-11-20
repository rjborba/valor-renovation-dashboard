import { createConfig, dashboardPort } from '../../config/vite.ts';

export default createConfig(import.meta.dirname, 0, {
  name: 'dashboard',
  remotes: {
    tasks: { type: 'module', name: 'tasks', entry: `http://localhost:${dashboardPort + 1}/mf-manifest.json` },
    summary: { type: 'module', name: 'summary', entry: `http://localhost:${dashboardPort + 2}/mf-manifest.json` },
    filters: { type: 'module', name: 'filters', entry: `http://localhost:${dashboardPort + 3}/mf-manifest.json` },
  },
});
