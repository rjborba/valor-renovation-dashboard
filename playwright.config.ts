import { defineConfig } from '@playwright/test';
import { dashboardOrigin, dashboardPort, filtersOrigin, reportsOrigin, tasksOrigin } from './tests/servers';

export default defineConfig({
  testDir: './tests',
  webServer: [
    {
      env: { VALOR_BASE_PORT: String(dashboardPort) },
      command: `npm run dev -w dashboard`,
      url: dashboardOrigin,
    },
    {
      env: { VALOR_BASE_PORT: String(dashboardPort) },
      command: `npm run dev -w tasks`,
      url: `${tasksOrigin}/mf-manifest.json`,
    },
    {
      env: { VALOR_BASE_PORT: String(dashboardPort) },
      command: `npm run dev -w reports`,
      url: `${reportsOrigin}/mf-manifest.json`,
    },
    {
      env: { VALOR_BASE_PORT: String(dashboardPort) },
      command: `npm run dev -w filters`,
      url: `${filtersOrigin}/mf-manifest.json`,
    },
  ],
  use: {
    baseURL: dashboardOrigin,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
    trace: 'retain-on-failure',
  },
});
