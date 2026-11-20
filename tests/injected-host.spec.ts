import { basename, join, resolve } from 'node:path';
import { rspack, type Configuration } from '@rspack/core';
import { test, expect } from '@playwright/test';
import { purchaseStorageKey } from '@valor/contracts/storage';

test('the real dashboard and remotes read and mutate an injected in-memory repository', async ({ page }, info) => {
  const output = info.outputPath('dashboard');
  const config: Configuration = require('../apps/dashboard/rspack.config.cjs')();
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
  // Keep the real loopback document so Chrome can load the remotes from their own ports.
  await page.route('/main.*.js', route => route.fulfill({ path: join(output, 'main.js') }));
  await page.goto('/');
  const receipt = page.getByRole('region', { name: 'Purchase ledger' }).locator('details').filter({ hasText: 'In-memory receipt' });
  const total = page.getByRole('region', { name: 'Spending summary' }).locator('dd').first();
  await expect(total).toHaveText('R$ 7,77');
  await receipt.locator('summary').click();
  await receipt.getByRole('button', { name: /^Delete purchase/i }).click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(receipt).toHaveCount(0);
  await expect(total).toHaveText('R$ 0,00');
  expect(await page.evaluate(key => localStorage.getItem(key), purchaseStorageKey)).toBeNull();
});
