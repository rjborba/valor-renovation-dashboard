import { defineConfig } from '@playwright/test';
import { dashboardOrigin, dashboardPort, reportsOrigin, tasksOrigin } from './tests/servers';

export default defineConfig({
  testDir: './tests',
  webServer: [
    {
      command: `npm run dev -w dashboard -- --env dashboardPort=${dashboardPort}`,
      url: dashboardOrigin,
    },
    {
      command: `npm run dev -w tasks -- --port ${dashboardPort + 1}`,
      url: `${tasksOrigin}/mf-manifest.json`,
    },
    {
      command: `npm run dev -w reports -- --port ${dashboardPort + 2}`,
      url: `${reportsOrigin}/mf-manifest.json`,
    },
  ],
  use: {
    baseURL: dashboardOrigin,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
    trace: 'retain-on-failure',
  },
});
