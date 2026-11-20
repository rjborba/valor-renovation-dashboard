import { deepStrictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { filterTasks, tasks } from '@valor/contracts';
import { summarizeCommitments } from './summarizeCommitments';

test('counts each displayed task once across all statuses', () => {
  deepStrictEqual(summarizeCommitments(tasks), {
    total: 5,
    counts: { Open: 2, 'In progress': 2, Done: 1 },
  });
});

test('counts a shared task once when filtering by assignee and status', () => {
  const filtered = filterTasks(tasks, { status: 'In progress', assignee: 'Electrician' });
  deepStrictEqual(summarizeCommitments(filtered), {
    total: 1,
    counts: { Open: 0, 'In progress': 1, Done: 0 },
  });
});

test('an empty result has a zero total and zero counts for each status', () => {
  deepStrictEqual(summarizeCommitments([]), {
    total: 0,
    counts: { Open: 0, 'In progress': 0, Done: 0 },
  });
});
