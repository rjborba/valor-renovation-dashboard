import { expect, test, type Locator, type Page } from '@playwright/test';
import { taskStorageKey } from '@valor/contracts/storage';
import { board, expectProgress, openWithStorage, readStorage, reports } from './task-ui';

const description = 'Confirm fixture heights';
const revised = 'Approve revised fixture heights';

async function addAssignee(editor: Locator, name: string) {
  await editor.getByLabel('New assignee', { exact: true }).fill(name);
  await editor.getByRole('button', { name: 'Add assignee', exact: true }).click();
  await expect(editor.getByRole('checkbox', { name, exact: true })).toBeChecked();
}

async function enterTask(page: Page) {
  await board(page).getByRole('button', { name: 'Add task' }).click();
  const editor = page.getByRole('dialog', { name: 'Add task' });
  await editor.getByLabel('Description', { exact: true }).fill(description);
  await editor.getByLabel('Promised due date', { exact: true }).fill('2027-04-10');
  await editor.getByLabel('Status', { exact: true }).selectOption('In progress');
  await addAssignee(editor, 'Site lead');
  await addAssignee(editor, 'Electrician');
  return editor;
}

test('creates, edits and deletes a shared task, persisting its owners, status and deadline on reload', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-04-08T12:00:00Z'));
  await openWithStorage(page, '[]');
  await expectProgress(page, 0, 0);
  const editor = await enterTask(page);
  await editor.getByRole('button', { name: 'Add task', exact: true }).click();
  const row = board(page).getByRole('article', { name: description, exact: true });
  await expect(row).toContainText('Site lead');
  await expect(row).toContainText('Electrician');
  const statusSymbol = row.getByRole('button', { name: 'Status: In progress', exact: true });
  await statusSymbol.hover();
  await expect(page.getByRole('tooltip')).toHaveText('In progress');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expectProgress(page, 0, 1);
  await reports(page).getByText(/Promised due dates/).click();
  await expect(reports(page).getByText(description, { exact: true })).toBeVisible();
  const [created] = JSON.parse((await readStorage(page))!);
  expect(created).toMatchObject({ description, dueDate: '2027-04-10', status: 'In progress' });
  expect([...created.assignees].sort()).toEqual(['Electrician', 'Site lead']);
  await page.reload();
  // Click the row's padding, away from its title and action controls.
  await row.click({ position: { x: 2, y: 2 } });
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();

  const edit = page.getByRole('dialog');
  await expect(edit.getByLabel('Promised due date')).toHaveValue('2027-04-10');
  await expect(edit.getByRole('checkbox', { name: 'Site lead' })).toBeChecked();
  await expect(edit.getByRole('checkbox', { name: 'Electrician' })).toBeChecked();
  await edit.getByLabel('Description', { exact: true }).fill(revised);
  await edit.getByLabel('Promised due date').fill('2027-04-12');
  await edit.getByLabel('Status', { exact: true }).selectOption('Done');
  await edit.getByRole('checkbox', { name: 'Electrician' }).uncheck();
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await expectProgress(page, 1, 1);
  await page.reload();
  const edited = board(page).getByRole('article', { name: revised, exact: true });
  await expect(edited.getByRole('button', { name: 'Status: Done', exact: true })).toBeVisible();
  await expectProgress(page, 1, 1);
  expect(JSON.parse((await readStorage(page))!)).toEqual([{
    id: created.id, description: revised, dueDate: '2027-04-12', status: 'Done', assignees: ['Site lead'],
  }]);

  const remove = edited.getByRole('button', { name: `Delete task: ${revised}` });
  await remove.click();
  const confirm = page.getByRole('dialog', { name: 'Delete task' });
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(edited).toBeVisible();
  await remove.click();
  await confirm.getByRole('button', { name: 'Delete task', exact: true }).click();
  await expectProgress(page, 0, 0);
  await page.reload();
  await expect(board(page).getByRole('article')).toHaveCount(0);
  await expectProgress(page, 0, 0);
  expect(await readStorage(page)).toBe('[]');
});

test('recovers from invalid stored data and retries a failed save with the draft intact', async ({ page }) => {
  await openWithStorage(page, '{broken');
  const error = page.getByRole('alert');
  await expect(error.getByRole('heading', { name: 'Could not open your task board' })).toBeVisible();
  expect(await readStorage(page)).toBe('{broken');
  await page.evaluate(key => localStorage.setItem(key, '[]'), taskStorageKey);
  await error.getByRole('button', { name: 'Retry loading tasks' }).click();
  await expectProgress(page, 0, 0);

  const editor = await enterTask(page);
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) {
        Storage.prototype.setItem = write;
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return write.call(this, name, value);
    };
  }, taskStorageKey);
  const save = editor.getByRole('button', { name: 'Add task', exact: true });
  await save.click();
  await expect(editor.getByRole('alert')).toHaveText('The task could not be saved. Try again.');
  await expect(editor.getByLabel('Description', { exact: true })).toHaveValue(description);
  expect(await readStorage(page)).toBe('[]');
  await save.click();
  await expect(editor).toHaveCount(0);
  await expectProgress(page, 0, 1);
  await expect(board(page).getByRole('article')).toHaveCount(1);
});

test('changes status from the row and retries a failed update without losing the task', async ({ page }) => {
  const task = { id: 'inline', description, dueDate: '2027-04-10', status: 'Open', assignees: ['Architect', 'Engineer'] };
  await openWithStorage(page, JSON.stringify([task]));
  const row = board(page).getByRole('article', { name: description });
  const trigger = row.getByRole('button', { name: 'Status: Open', exact: true });
  const menu = page.getByRole('menu', { name: 'Change task status' });
  await trigger.press('Enter');
  await expect(menu.getByRole('menuitemradio', { name: 'Open', exact: true })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) {
        Storage.prototype.setItem = write;
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return write.call(this, name, value);
    };
  }, taskStorageKey);
  await trigger.click();
  await menu.getByRole('menuitemradio', { name: 'Done', exact: true }).click();
  await expect(row.getByRole('alert')).toContainText('Could not save the status');
  await expectProgress(page, 0, 1);
  await trigger.click();
  await menu.getByRole('menuitemradio', { name: 'Done', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Status: Done' })).toBeVisible();
  await expect(row.getByRole('alert')).toHaveCount(0);
  await expectProgress(page, 1, 1);
  await page.reload();
  await expectProgress(page, 1, 1);
  expect(JSON.parse((await readStorage(page))!)).toEqual([{ ...task, status: 'Done' }]);
});

test.describe('default promised date', () => {
  test.use({ timezoneId: 'America/Recife' });

  test('uses the local date each time the add dialog opens', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2027-04-09T02:59:00Z'));
    await page.goto('/');
    const add = board(page).getByRole('button', { name: 'Add task' });
    const dialog = page.getByRole('dialog', { name: 'Add task' });
    await add.click();
    await expect(dialog.getByLabel('Promised due date')).toHaveValue('2027-04-08');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await page.clock.setFixedTime(new Date('2027-04-09T03:01:00Z'));
    await add.click();
    await expect(dialog.getByLabel('Promised due date')).toHaveValue('2027-04-09');
  });
});
