import { defineConfig } from '@playwright/test';
import { dashboardOrigin, dashboardPort, editorOrigin, filtersOrigin, reportsOrigin, tasksOrigin } from './tests/servers';

export default defineConfig({
  testDir: './tests',
  webServer: [
    {
      command: `npm run dev -w dashboard -- --env dashboardPort=${dashboardPort}`,
      url: dashboardOrigin,
    },
    {
      command: `npm run dev -w tasks -- --port ${dashboardPort + 1} --env editorPort=${dashboardPort + 4}`,
      url: `${tasksOrigin}/mf-manifest.json`,
    },
    {
      command: `npm run dev -w reports -- --port ${dashboardPort + 2}`,
      url: `${reportsOrigin}/mf-manifest.json`,
    },
    {
      command: `npm run dev -w filters -- --port ${dashboardPort + 3}`,
      url: `${filtersOrigin}/mf-manifest.json`,
    },
    {
      command: `npm run dev -w editor -- --port ${dashboardPort + 4}`,
      url: `${editorOrigin}/mf-manifest.json`,
    },
  ],
  use: {
    baseURL: dashboardOrigin,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
    trace: 'retain-on-failure',
  },
});
