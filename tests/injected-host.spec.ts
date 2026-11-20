import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { board, expectProgress, readStorage } from './task-ui';

test('the real dashboard and remotes read and mutate an injected in-memory repository', async ({ page }) => {
  // Keep the host's real Vite initialization and substitute only the React entry.
  const entry = '/@fs/' + resolve(import.meta.dirname, 'fixtures/injected-host.ts');
  await page.route('/src/index.ts', route => route.fulfill({
    contentType: 'application/javascript',
    body: `import ${JSON.stringify(entry)};`,
  }));
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
