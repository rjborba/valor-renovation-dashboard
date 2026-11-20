import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { filterTasks, type RenovationTask } from '@valor/contracts';
import { localDateKey, summarizeCommitments } from './summarizeCommitments';

const today = '2026-11-20';
const shared: RenovationTask = {
  id: 'shared',
  description: 'Confirm the island outlet positions.',
  status: 'In progress',
  dueDate: '2026-11-21',
  assignees: ['Architect', 'Electrician'],
};
const dueToday: RenovationTask = { ...shared, id: 'today', dueDate: today };
const pastDue: RenovationTask = { ...shared, id: 'late', status: 'Open', dueDate: '2026-11-19' };
const earliest: RenovationTask = { ...pastDue, id: 'earliest', dueDate: '2026-10-31' };
const done: RenovationTask = { ...pastDue, id: 'complete', status: 'Done' };

test('groups unfinished deadlines around today and orders each group by promised date', () => {
  const tasks = Object.freeze([shared, pastDue, done, earliest, dueToday]);

  deepStrictEqual(summarizeCommitments(tasks, today), {
    total: 5,
    counts: { Open: 2, 'In progress': 2, Done: 1 },
    overdue: [earliest, pastDue],
    upcoming: [dueToday, shared],
  });
});

test('counts a task with multiple owners once in the filtered result', () => {
  const tasks = filterTasks([shared, done], { status: 'In progress', assignee: 'Electrician' });

  deepStrictEqual(summarizeCommitments(tasks, today), {
    total: 1,
    counts: { Open: 0, 'In progress': 1, Done: 0 },
    overdue: [],
    upcoming: [shared],
  });
});

test('completed tasks stay out of the schedule, even with past or future due dates', () => {
  const doneLater = { ...done, id: 'complete-early', dueDate: '2026-11-26' };

  deepStrictEqual(summarizeCommitments([done, doneLater], today), {
    total: 2,
    counts: { Open: 0, 'In progress': 0, Done: 2 },
    overdue: [],
    upcoming: [],
  });
});

test('an empty filtered result has zero counts and no deadlines', () => {
  deepStrictEqual(summarizeCommitments([], today), {
    total: 0,
    counts: { Open: 0, 'In progress': 0, Done: 0 },
    overdue: [],
    upcoming: [],
  });
});

test('uses the local day at both ends of the day and across midnight', () => {
  const start = new Date(2026, 10, 20, 0, 1);
  const end = new Date(2026, 10, 20, 23, 59);
  const next = new Date(2026, 10, 21, 0, 1);

  strictEqual(localDateKey(start), today);
  strictEqual(localDateKey(end), today);
  strictEqual(localDateKey(next), '2026-11-21');
  deepStrictEqual(summarizeCommitments([dueToday], localDateKey(end)).upcoming, [dueToday]);
  deepStrictEqual(summarizeCommitments([dueToday], localDateKey(next)).overdue, [dueToday]);
});
