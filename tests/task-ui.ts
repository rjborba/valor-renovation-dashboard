import { expect, type Page } from '@playwright/test';
import { taskStorageKey } from '@valor/contracts/storage';

export const board = (page: Page) => page.getByRole('region', { name: 'Task board' });
export const filtersPanel = (page: Page) => page.getByRole('region', { name: 'Task filters' });
export const reports = (page: Page) => page.getByRole('region', { name: 'Task summary' });

export async function expectProgress(page: Page, done: number, total: number) {
  await expect(reports(page).getByText(`${done} of ${total} ${total === 1 ? 'task' : 'tasks'} done`, { exact: true })).toBeVisible();
}

export async function openWithStorage(page: Page, raw: string) {
  // Seed the real origin once, so reloads exercise the application's own persistence.
  await page.route('/__storage_setup__', route => route.fulfill({ contentType: 'text/html', body: '' }));
  await page.goto('/__storage_setup__');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [taskStorageKey, raw]);
  await page.goto('/');
}

export const readStorage = (page: Page) => page.evaluate(key => localStorage.getItem(key), taskStorageKey);
