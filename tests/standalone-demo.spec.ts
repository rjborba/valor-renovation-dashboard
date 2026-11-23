import { expect, test } from '@playwright/test';
import { tasks } from '@valor/contracts';
import { tasksOrigin } from './servers';
import { board, readStorage } from './task-ui';

test('standalone Tasks edits demo state without using the dashboard repository', async ({ page }) => {
  await page.goto(tasksOrigin);
  await expect(board(page).getByRole('article')).toHaveCount(5);
  await board(page).getByRole('button', { name: 'Add task' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Description', { exact: true }).fill('Standalone demo task');
  await editor.getByLabel('New assignee', { exact: true }).fill('Demo owner');
  await editor.getByRole('button', { name: 'Add assignee', exact: true }).click();
  await editor.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(board(page).getByRole('article')).toHaveCount(6);

  const added = board(page).getByRole('article', { name: 'Standalone demo task', exact: true });
  await added.getByRole('button', { name: 'Edit task: Standalone demo task' }).click();
  await editor.getByLabel('Description', { exact: true }).fill('Updated standalone demo task');
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expect(board(page).getByRole('article', { name: 'Updated standalone demo task', exact: true })).toBeVisible();

  const original = board(page).getByRole('article', { name: tasks[0].description, exact: true });
  await original.getByRole('button', { name: /^Delete task:/ }).click();
  await page.getByRole('dialog', { name: 'Delete task' }).getByRole('button', { name: 'Delete task', exact: true }).click();
  await expect(original).toHaveCount(0);
  await expect(board(page).getByRole('article')).toHaveCount(5);
  expect(await readStorage(page)).toBeNull();
  await page.reload();
  await expect(original).toBeVisible();
  await expect(board(page).getByRole('article', { name: 'Updated standalone demo task', exact: true })).toHaveCount(0);
});
