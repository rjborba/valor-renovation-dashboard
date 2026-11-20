import { basename, join, resolve } from 'node:path';
import { rspack, type Configuration } from '@rspack/core';
import { test, expect } from '@playwright/test';
import { dashboardPort } from './servers';
import { board, expectProgress, readStorage } from './task-ui';

test('the real dashboard and remotes read and mutate an injected in-memory repository', async ({ page }, info) => {
  const output = info.outputPath('dashboard');
  const config: Configuration = require('../apps/dashboard/rspack.config.cjs')({ dashboardPort });
  await new Promise<void>((done, reject) => {
    rspack({
      ...config,
      mode: 'development',
      devtool: false,
      entry: resolve(__dirname, 'fixtures/injected-host.ts'),
      output: { ...config.output, path: output, filename: '[name].js', publicPath: '/__injected__/' },
    }, (error, stats) => {
      if (error) reject(error);
      else if (!stats || stats.hasErrors()) reject(new Error(stats?.toString('errors-only') ?? 'Dashboard build failed'));
      else done();
    });
  });
  await page.route('**/__injected__/*', route => {
    const name = basename(new URL(route.request().url()).pathname);
    return route.fulfill({ path: join(output, name) });
  });
  // Keep the host document on loopback and load both real remote containers.
  await page.route('/main.js', route => route.fulfill({ path: join(output, 'main.js') }));
  await page.goto('/');
  const row = board(page).getByRole('article', { name: 'Inspect the injected board' });
  await expect(row).toContainText('Inspector');
  await expectProgress(page, 0, 1);
  await row.getByRole('button', { name: 'Edit task: Inspect the injected board' }).press('Enter');
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Status', { exact: true }).selectOption('Done');
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expectProgress(page, 1, 1);
  await row.getByRole('button', { name: 'Delete task: Inspect the injected board' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).click();
  await expect(row).toHaveCount(0);
  await expectProgress(page, 0, 0);
  expect(await readStorage(page)).toBeNull();
});
