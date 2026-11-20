import { expect, test } from '@playwright/test';
import { editorOrigin, tasksOrigin } from './servers';
import { board, expectProgress } from './task-ui';

test('loads the editor on demand and retries its remote independently', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith(editorOrigin + '/')) requests.push(request.url());
  });
  const url = editorOrigin + '/mf-manifest.json';
  await page.route(url, route => route.abort('connectionfailed'));
  await page.goto('/');
  const add = board(page).getByRole('button', { name: 'Add task' });
  await expect(add).toBeVisible();
  await expectProgress(page, 1, 5);
  expect(requests).toEqual([]);

  await add.click();
  const fallback = page.getByRole('dialog', { name: 'Task editor', exact: true });
  await expect(fallback.getByRole('alert')).toContainText('could not load');
  await fallback.getByRole('button', { name: 'Cancel' }).click();
  await expect(add).toBeFocused();
  await board(page).getByRole('button', { name: /^Delete task:/ }).first().click();
  await page.getByRole('dialog', { name: 'Delete task' }).getByRole('button', { name: 'Cancel' }).click();

  await add.click();
  await expect(fallback.getByRole('button', { name: 'Retry editor' })).toBeVisible();
  await page.unroute(url);
  await Promise.all([
    page.waitForResponse(r => r.url() === editorOrigin + '/remoteEntry.js' && r.ok()),
    fallback.getByRole('button', { name: 'Retry editor' }).click(),
  ]);
  const editor = page.getByRole('dialog', { name: 'Add task' });
  await expect(editor.getByText('editor/TaskEditor')).toBeVisible();
  await expect(editor.getByLabel('Description')).toBeFocused();
  await editor.press('Escape');
  await expect(add).toBeFocused();
});

test('the standalone Tasks consumer and Editor app can each open the editor', async ({ page }) => {
  for (const origin of [tasksOrigin, editorOrigin]) {
    await page.goto(origin);
    await page.getByRole('button', { name: 'Add task', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Add task' });
    await expect(editor.getByText('editor/TaskEditor')).toBeVisible();
    await editor.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Add task', exact: true })).toBeFocused();
  }
});

test('an editor render failure stays inside the modal and retries with the board intact', async ({ page }) => {
  await page.goto('/');
  const filter = page.getByRole('combobox', { name: 'Assignee' });
  await filter.selectOption('Engineer');
  const add = board(page).getByRole('button', { name: 'Add task' });
  const row = board(page).getByRole('article').first();
  const originalRow = await row.elementHandle();

  // The new-task form reads the local year while rendering its default due date.
  const restore = await page.evaluateHandle(() => {
    const getFullYear = Date.prototype.getFullYear;
    Date.prototype.getFullYear = () => { throw new Error('Simulated editor render failure'); };
    return () => { Date.prototype.getFullYear = getFullYear; };
  });
  await add.click();
  const fallback = page.getByRole('dialog', { name: 'Task editor', exact: true });
  await expect(fallback.getByRole('alert')).toBeVisible();
  await fallback.getByRole('button', { name: 'Cancel' }).click();
  await expect(add).toBeFocused();
  await expect(filter).toHaveValue('Engineer');

  await add.click();
  await expect(fallback.getByRole('alert')).toBeVisible();
  await restore.evaluate(undo => undo());
  await fallback.getByRole('button', { name: 'Retry editor' }).click();
  const editor = page.getByRole('dialog', { name: 'Add task', exact: true });
  await expect(editor.getByLabel('Description')).toBeFocused();
  await editor.press('Escape');
  await expect(add).toBeFocused();
  await expectProgress(page, 0, 1);
  expect(await originalRow!.evaluate(el => el.isConnected)).toBe(true);
});
