import { expect, test } from '@playwright/test';

const expensesOrigin = 'http://localhost:3001';
const reportsOrigin = 'http://localhost:3002';

test('loads both federated features from their own origins and stacks them on mobile', async ({ page }) => {
  const manifests = [expensesOrigin, reportsOrigin].map(origin =>
    page.waitForResponse(response => response.url() === `${origin}/mf-manifest.json` && response.ok()),
  );
  const entries = [expensesOrigin, reportsOrigin].map(origin =>
    page.waitForResponse(response => response.url() === `${origin}/remoteEntry.js` && response.ok()),
  );

  await page.goto('/');
  await Promise.all([...manifests, ...entries]);
  const expenses = page.getByRole('region', { name: 'Purchase ledger' });
  const reports = page.getByRole('region', { name: 'Spending summary' });
  await expect(expenses).toBeVisible();
  await expect(reports.getByText('R$ 6.820,40')).toBeVisible();
  const desktopExpenses = (await expenses.boundingBox())!;
  const desktopReports = (await reports.boundingBox())!;
  expect(desktopReports.x).toBeGreaterThanOrEqual(desktopExpenses.x + desktopExpenses.width);

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileExpenses = (await expenses.boundingBox())!;
  const mobileReports = (await reports.boundingBox())!;
  expect(mobileReports.x).toBeCloseTo(mobileExpenses.x);
  expect(mobileReports.y).toBeGreaterThanOrEqual(mobileExpenses.y + mobileExpenses.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

  await expenses.getByRole('combobox', { name: 'Room', exact: true }).selectOption('Kitchen');
  await expenses.getByRole('combobox', { name: 'Supplier', exact: true }).selectOption('Clay Studio');
  await expect(expenses.getByRole('status')).toHaveText('1 purchase');
  await expect(reports.getByRole('listitem')).toHaveCount(1);
  await expect(reports.getByRole('listitem').getByText('R$ 1.166,40')).toBeVisible();
});

test('retries an unavailable reports manifest and keeps both chosen filters', async ({ page }) => {
  const manifestUrl = `${reportsOrigin}/mf-manifest.json`;
  await page.route(manifestUrl, route => route.abort('connectionfailed'));
  await page.goto('/');

  const alert = page.getByRole('alert');
  await expect(alert.getByRole('heading', { name: 'Reports is unavailable' })).toBeVisible();
  const expenses = page.getByRole('region', { name: 'Purchase ledger' });
  const room = expenses.getByRole('combobox', { name: 'Room', exact: true });
  const supplier = expenses.getByRole('combobox', { name: 'Supplier', exact: true });
  await room.selectOption('Kitchen');
  await supplier.selectOption('Clay Studio');
  await expect(expenses.getByRole('status')).toHaveText('1 purchase');

  const retry = alert.getByRole('button', { name: 'Retry Reports' });
  const failedRequest = page.waitForEvent('requestfailed', { predicate: request => request.url() === manifestUrl });
  await retry.focus();
  await retry.press('Enter');
  await failedRequest;
  await expect(retry).toBeVisible();

  await page.unroute(manifestUrl);
  const restoredManifest = page.waitForResponse(response => response.url() === manifestUrl && response.ok());
  await retry.click();
  await restoredManifest;
  const reports = page.getByRole('region', { name: 'Spending summary' });
  await expect(reports.getByRole('listitem')).toHaveCount(1);
  await expect(reports.getByRole('listitem')).toHaveText(/Kitchen\s+R\$\s+1\.166,40/);
  await expect(alert).toHaveCount(0);
  await expect(room).toHaveValue('Kitchen');
  await expect(supplier).toHaveValue('Clay Studio');
});

test('retries the expenses remote entry while reports stays available', async ({ page }) => {
  const entryUrl = `${expensesOrigin}/remoteEntry.js`;
  await page.route(entryUrl, route => route.abort('connectionfailed'));
  await page.goto('/');

  const alert = page.getByRole('alert');
  await expect(alert.getByRole('heading', { name: 'Expenses is unavailable' })).toBeVisible();
  const reports = page.getByRole('region', { name: 'Spending summary' });
  await expect(reports.getByText('R$ 6.820,40')).toBeVisible();

  await page.unroute(entryUrl);
  const restoredEntry = page.waitForResponse(response => response.url() === entryUrl && response.ok());
  await alert.getByRole('button', { name: 'Retry Expenses' }).click();
  await restoredEntry;
  const expenses = page.getByRole('region', { name: 'Purchase ledger' });
  await expect(expenses.getByRole('status')).toHaveText('8 purchases');
  await expect(alert).toHaveCount(0);
  await expenses.getByRole('combobox', { name: 'Room', exact: true }).selectOption('Bathroom');
  await expect(reports.getByRole('listitem')).toHaveText(/Bathroom\s+R\$\s+2\.041,00/);
});
