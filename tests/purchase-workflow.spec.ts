import { expect, test, type Page } from '@playwright/test';
import { purchaseStorageKey } from '@valor/contracts/storage';

async function openLedger(page: Page, stored: string) {
  // Set up the origin once. Subsequent reloads exercise only production storage.
  await page.route('**/__storage_setup__', route => route.fulfill({ contentType: 'text/html', body: '' }));
  await page.goto('/__storage_setup__');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [purchaseStorageKey, stored]);
  await page.goto('/');
}

const readStored = (page: Page) => page.evaluate(key => localStorage.getItem(key), purchaseStorageKey);
const ledger = (page: Page) => page.getByRole('region', { name: 'Purchase ledger' });
const form = (page: Page) => page.getByRole('dialog');

async function startPurchase(page: Page) {
  await ledger(page).getByRole('button', { name: 'Add purchase' }).click();
  const editor = form(page);
  await editor.getByLabel('Description', { exact: true }).fill('Workshop primer');
  await editor.getByLabel('Date', { exact: true }).fill('2026-11-20');
  await editor.getByLabel('Room', { exact: true }).fill('Workshop');
  await editor.getByLabel('Supplier', { exact: true }).fill('Test supplier');
  await editor.getByLabel('Amount paid (BRL)', { exact: true }).fill('12.35');
  await editor.getByText('Receipt details', { exact: true }).click();
  await editor.getByLabel('Discount (BRL)', { exact: true }).fill('0.05');
  await editor.getByRole('button', { name: 'Add line item' }).click();
  await editor.getByLabel('Item name').fill('Primer (L)');
  await editor.getByLabel('Quantity').fill('0.5');
  await editor.getByLabel('Unit price (BRL)').fill('24.80');
}

async function expectReport(page: Page, total: string, count: number) {
  const metrics = page.getByRole('region', { name: 'Spending summary' }).locator('dd');
  await expect(metrics.nth(0)).toHaveText(total);
  await expect(metrics.nth(1)).toHaveText(String(count));
}

test('add, edit and delete update reports immediately and survive reload, including an empty ledger', async ({ page }) => {
  await openLedger(page, '[]');
  await expectReport(page, 'R$ 0,00', 0);
  await startPurchase(page);
  await form(page).getByRole('button', { name: 'Cancel' }).click();
  await expectReport(page, 'R$ 0,00', 0);
  expect(await readStored(page)).toBe('[]');

  await startPurchase(page);
  await form(page).getByRole('button', { name: 'Save purchase' }).click();
  await expectReport(page, 'R$ 12,35', 1);
  await page.reload();
  const receipt = ledger(page).locator('details').filter({ hasText: 'Workshop primer' });
  await receipt.locator('summary').click();
  await expectReport(page, 'R$ 12,35', 1);
  const saved = JSON.parse((await readStored(page))!);
  expect(saved).toEqual([expect.objectContaining({ date: '2026-11-20', room: 'Workshop',
    supplier: 'Test supplier', paidCents: 1235, discountCents: 5,
    items: [{ name: 'Primer (L)', quantity: 0.5, unitPriceCents: 2480 }] })]);

  await receipt.getByRole('button', { name: /^Edit purchase/i }).click();
  await form(page).getByLabel('Amount paid (BRL)').fill('45.67');
  await form(page).getByText('Receipt details', { exact: true }).click();
  await form(page).getByLabel('Quantity').fill('2.5');
  await form(page).getByRole('button', { name: 'Save purchase' }).click();
  await expectReport(page, 'R$ 45,67', 1);
  await page.reload();
  await expectReport(page, 'R$ 45,67', 1);
  expect(JSON.parse((await readStored(page))!)).toEqual([{
    ...saved[0], paidCents: 4567, items: [{ ...saved[0].items[0], quantity: 2.5 }],
  }]);
  await receipt.locator('summary').click();
  await expect(receipt.getByRole('table', { name: 'Line items' })).toContainText('2.5');
  await receipt.getByRole('button', { name: /^Delete purchase/i }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expectReport(page, 'R$ 45,67', 1);
  await receipt.getByRole('button', { name: /^Delete purchase/i }).click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expectReport(page, 'R$ 0,00', 0);
  await page.reload();
  await expect(ledger(page).getByText('No purchases recorded')).toBeVisible();
  await expectReport(page, 'R$ 0,00', 0);
  expect(await readStored(page)).toBe('[]');
});

test('invalid stored data and failed writes show errors and preserve the last saved ledger', async ({ page }) => {
  await openLedger(page, '{broken');
  const loadError = page.getByRole('alert');
  await expect(loadError.getByRole('heading', { name: 'Could not open your purchase ledger' })).toBeVisible();
  expect(await readStored(page)).toBe('{broken');
  await page.evaluate(key => localStorage.setItem(key, '[]'), purchaseStorageKey);
  await loadError.getByRole('button', { name: 'Retry loading purchases' }).click();
  await expectReport(page, 'R$ 0,00', 0);

  await startPurchase(page);
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      return write.call(this, name, value);
    };
  }, purchaseStorageKey);
  await form(page).getByRole('button', { name: 'Save purchase' }).click();
  await expect(form(page).getByRole('alert')).toContainText('Storage quota exceeded');
  await expect(form(page).getByLabel('Description')).toHaveValue('Workshop primer');
  await form(page).getByRole('button', { name: 'Cancel' }).click();
  await expectReport(page, 'R$ 0,00', 0);
  expect(await readStored(page)).toBe('[]');
  await page.reload();
  await expectReport(page, 'R$ 0,00', 0);
});
