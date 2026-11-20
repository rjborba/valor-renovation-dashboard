import { expect, test } from '@playwright/test';
import { reportsOrigin, tasksOrigin } from './servers';
import { board, expectProgress, reports } from './task-ui';

test('loads both independent modules over HTTP and stacks them on mobile', async ({ page }) => {
  const assets = [tasksOrigin, reportsOrigin].flatMap(origin =>
    ['mf-manifest.json', 'remoteEntry.js'].map(file =>
      page.waitForResponse(response => response.url() === `${origin}/${file}` && response.ok()),
    ),
  );
  await Promise.all([page.goto('/'), ...assets]);
  for (const [moduleId, heading] of [
    ['tasks/TasksFeature', 'Task board'],
    ['reports/ReportsFeature', 'Commitment progress'],
  ]) {
    const frame = page.getByRole('group', { name: `Federated module ${moduleId}`, exact: true });
    await expect(frame.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  // Each remote loads CSS. Its base utilities must respect the shell's desktop breakpoint.
  await expect(page.getByRole('main')).toHaveCSS('padding-left', '48px');
  const tasksBox = (await board(page).boundingBox())!;
  const reportsBox = (await reports(page).boundingBox())!;
  expect(reportsBox.x).toBeGreaterThanOrEqual(tasksBox.x + tasksBox.width);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('main')).toHaveCSS('padding-left', '16px');
  const mobileTasks = (await board(page).boundingBox())!;
  const mobileReports = (await reports(page).boundingBox())!;
  expect(mobileReports.x).toBeCloseTo(mobileTasks.x);
  expect(mobileReports.y).toBeGreaterThanOrEqual(mobileTasks.y + mobileTasks.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('status and assignee intersect across the board and summary, including an empty result', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00Z'));
  await page.goto('/');
  const filters = board(page).getByRole('group', { name: 'Task filters' });
  const status = filters.getByRole('combobox', { name: 'Status', exact: true });
  const assignee = filters.getByRole('combobox', { name: 'Assignee', exact: true });
  await expectProgress(page, 1, 5);
  const counts = reports(page).getByLabel('Task counts by status');
  await expect(counts.getByRole('definition')).toHaveText(['2', '2', '1']);
  const overdue = reports(page).getByRole('list', { name: 'Overdue' });
  await expect(overdue.getByRole('listitem')).toHaveCount(1);
  await expect(overdue.locator('time')).toHaveAttribute('datetime', '2026-11-23');
  await expect(reports(page).getByRole('list', { name: 'Upcoming' })).toContainText('Due today');
  await assignee.selectOption({ label: 'Electrician' });
  await expect(board(page).getByRole('article')).toHaveCount(2);
  await expectProgress(page, 1, 2);
  await status.selectOption({ label: 'Done' });
  await expect(board(page).getByRole('article')).toHaveCount(1);
  await expect(board(page).getByRole('article')).toContainText('bedroom reading light');
  await expectProgress(page, 1, 1);
  await expect(counts.getByRole('definition')).toHaveText(['0', '0', '1']);
  await expect(reports(page).getByText('No outstanding deadlines.')).toBeVisible();
  await assignee.selectOption({ label: 'Engineer' });
  await expect(board(page).getByRole('article')).toHaveCount(0);
  await expectProgress(page, 0, 0);
  await board(page).getByRole('button', { name: 'Clear filters' }).click();
  await expect(board(page).getByRole('article')).toHaveCount(5);
  await expectProgress(page, 1, 5);
});

test('retries a missing Reports manifest and keeps the chosen task filters', async ({ page }) => {
  const url = `${reportsOrigin}/mf-manifest.json`;
  await page.route(url, route => route.abort('connectionfailed'));
  await page.goto('/');
  const retry = page.getByRole('alert').getByRole('button', { name: 'Retry Reports' });
  await expect(retry).toBeVisible();
  const status = board(page).getByRole('combobox', { name: 'Status', exact: true });
  const assignee = board(page).getByRole('combobox', { name: 'Assignee', exact: true });
  await status.selectOption('In progress');
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
  await expect(status).toHaveValue('In progress');
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

test('each remote renders directly with its own standalone wrapper', async ({ page }) => {
  await page.goto(tasksOrigin);
  await expect(board(page).getByRole('article')).toHaveCount(5);
  await page.goto(reportsOrigin);
  await expectProgress(page, 1, 5);
});
