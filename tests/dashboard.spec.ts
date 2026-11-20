import { expect, test } from '@playwright/test';
import { filtersOrigin, reportsOrigin, tasksOrigin } from './servers';
import { board, expectProgress, filtersPanel, reports } from './task-ui';

test('loads three independent remotes and places the summary above filters and tasks', async ({ page }) => {
  const assets = [tasksOrigin, reportsOrigin, filtersOrigin].flatMap(origin =>
    ['mf-manifest.json', 'remoteEntry.js'].map(file =>
      page.waitForResponse(response => response.url() === `${origin}/${file}` && response.ok()),
    ),
  );
  await Promise.all([page.goto('/'), ...assets]);
  for (const [moduleId, heading] of [
    ['tasks/TasksFeature', 'Task board'],
    ['reports/ReportsFeature', 'Task summary'],
    ['filters/FiltersFeature', 'Task filters'],
  ]) {
    const frame = page.getByRole('group', { name: `Federated module ${moduleId}`, exact: true });
    await expect(frame.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  // Each remote loads CSS. Its base utilities must respect the shell's desktop breakpoint.
  await expect(page.getByRole('main')).toHaveCSS('padding-left', '48px');
  const tasksBox = (await board(page).boundingBox())!;
  const reportsBox = (await reports(page).boundingBox())!;
  const filtersBox = (await filtersPanel(page).boundingBox())!;
  expect(filtersBox.x).toBeGreaterThanOrEqual(tasksBox.x + tasksBox.width);
  expect(reportsBox.y + reportsBox.height).toBeLessThanOrEqual(Math.min(filtersBox.y, tasksBox.y));
  expect(reportsBox.width).toBeGreaterThan(tasksBox.width + filtersBox.width);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('main')).toHaveCSS('padding-left', '16px');
  const mobileTasks = (await board(page).boundingBox())!;
  const mobileReports = (await reports(page).boundingBox())!;
  expect(mobileReports.x).toBeCloseTo(mobileTasks.x);
  const mobileFilters = (await filtersPanel(page).boundingBox())!;
  expect(mobileFilters.y).toBeGreaterThanOrEqual(mobileReports.y + mobileReports.height);
  expect(mobileTasks.y).toBeGreaterThanOrEqual(mobileFilters.y + mobileFilters.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('status and assignee intersect across the board and summary, including an empty result', async ({ page }) => {
  await page.goto('/');
  const filters = filtersPanel(page);
  const status = filters.getByRole('combobox', { name: 'Status', exact: true });
  const assignee = filters.getByRole('combobox', { name: 'Assignee', exact: true });
  await expectProgress(page, 1, 5);
  const counts = reports(page).getByLabel('Task counts by status');
  await expect(counts.getByRole('definition')).toHaveText(['2', '2', '1']);
  await expect(reports(page).getByText(/Promised due dates/)).toHaveCount(0);
  await assignee.selectOption({ label: 'Electrician' });
  await expect(board(page).getByRole('article')).toHaveCount(2);
  await expectProgress(page, 1, 2);
  await status.click();
  const list = page.getByRole('listbox');
  for (const name of ['All statuses', 'Open', 'In progress', 'Done']) {
    const option = list.getByRole('option', { name, exact: true });
    await expect(option.getByText(name, { exact: true }).locator('svg')).toBeVisible();
  }
  await list.getByRole('option', { name: 'Done', exact: true }).click();
  await expect(status.getByText('Done', { exact: true }).locator('svg')).toBeVisible();
  await expect(board(page).getByRole('article')).toHaveCount(1);
  await expect(board(page).getByRole('article')).toContainText('bedroom reading light');
  await expectProgress(page, 1, 1);
  await expect(counts.getByRole('definition')).toHaveText(['0', '0', '1']);
  await assignee.selectOption({ label: 'Engineer' });
  await expect(board(page).getByRole('article')).toHaveCount(0);
  await expectProgress(page, 0, 0);
  await filtersPanel(page).getByRole('button', { name: 'Clear filters' }).click();
  await expect(board(page).getByRole('article')).toHaveCount(5);
  await expectProgress(page, 1, 5);
});

test('retries a missing Reports manifest and keeps the chosen task filters', async ({ page }) => {
  const url = `${reportsOrigin}/mf-manifest.json`;
  await page.route(url, route => route.abort('connectionfailed'));
  await page.goto('/');
  const retry = page.getByRole('alert').getByRole('button', { name: 'Retry Reports' });
  await expect(retry).toBeVisible();
  const status = filtersPanel(page).getByRole('combobox', { name: 'Status', exact: true });
  const assignee = filtersPanel(page).getByRole('combobox', { name: 'Assignee', exact: true });
  await status.click();
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  await assignee.selectOption('Electrician');
  await expect(board(page).getByRole('article')).toHaveCount(1);

  await Promise.all([
    page.waitForEvent('requestfailed', { predicate: request => request.url() === url }),
    retry.press('Enter'),
  ]);
  await expect(retry).toBeVisible();
  await page.unroute(url);
  await Promise.all([
    page.waitForResponse(response => response.url() === url && response.ok()),
    retry.click(),
  ]);
  await expectProgress(page, 0, 1);
  await expect(status).toHaveText('In progress');
  await expect(assignee).toHaveValue('Electrician');
  await expect(retry).toHaveCount(0);
});

test('recovers the Tasks entry while Reports continues serving the saved board', async ({ page }) => {
  const url = `${tasksOrigin}/remoteEntry.js`;
  await page.route(url, route => route.abort('connectionfailed'));
  await page.goto('/');
  const retry = page.getByRole('alert').getByRole('button', { name: 'Retry Tasks' });
  await expect(retry).toBeVisible();
  await expectProgress(page, 1, 5);
  await page.unroute(url);
  await Promise.all([
    page.waitForResponse(response => response.url() === url && response.ok()),
    retry.click(),
  ]);
  await expect(board(page).getByRole('article')).toHaveCount(5);
  await expect(retry).toHaveCount(0);
});

test('retries Filters independently while Tasks and Reports remain usable', async ({ page }) => {
  const url = `${filtersOrigin}/mf-manifest.json`;
  await page.route(url, route => route.abort('connectionfailed'));
  await page.goto('/');
  const retry = page.getByRole('button', { name: 'Retry Filters' });
  await expect(retry).toBeVisible();
  await expect(board(page).getByRole('article')).toHaveCount(5);
  await expectProgress(page, 1, 5);
  await page.unroute(url);
  await retry.click();
  await filtersPanel(page).getByRole('combobox', { name: 'Assignee' }).selectOption('Engineer');
  await expect(board(page).getByRole('article')).toHaveCount(1);
  await expectProgress(page, 0, 1);
});

test('each remote renders directly with its own standalone wrapper', async ({ page }) => {
  await page.goto(tasksOrigin);
  await expect(board(page).getByRole('article')).toHaveCount(5);
  // A standalone Tasks app can open both dialogs using only its own origin.
  const requests: string[] = [];
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === tasksOrigin) return route.continue();
    requests.push(route.request().url());
    return route.abort();
  });
  const add = board(page).getByRole('button', { name: 'Add task' });
  await add.click();
  await expect(page.getByRole('dialog', { name: 'Add task' }).getByLabel('Description')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
  await board(page).getByRole('button', { name: /^Edit task:/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Description')).toBeFocused();
  await page.keyboard.press('Escape');
  expect(requests).toEqual([]);
  await page.unroute('**/*');
  await page.goto(reportsOrigin);
  await expectProgress(page, 1, 5);
  await page.goto(filtersOrigin);
  const assignee = filtersPanel(page).getByRole('combobox', { name: 'Assignee' });
  await assignee.selectOption('Engineer');
  await filtersPanel(page).getByRole('button', { name: 'Clear filters' }).click();
  await expect(assignee).toHaveValue('');
});
