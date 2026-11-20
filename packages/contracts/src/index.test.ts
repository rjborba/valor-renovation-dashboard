import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFilters, filterTasks, normalizeAssignees, tasks, taskStatuses } from './index';

test('seed tasks cover the four trades, all statuses and shared responsibility', () => {
  assert.deepEqual(new Set(tasks.map(task => task.status)), new Set(taskStatuses));
  assert.deepEqual(new Set(tasks.flatMap(task => task.assignees)),
    new Set(['Architect', 'Engineer', 'Electrician', 'Stone contractor']));
  assert.ok(tasks.some(task => task.assignees.length > 1));
});

test('joint owners match either assignee and status filters intersect', () => {
  assert.deepEqual(filterTasks(tasks, { status: 'In progress', assignee: 'electrician' }).map(t => t.id), ['RT-001']);
  assert.deepEqual(filterTasks(tasks, { status: '', assignee: 'Architect' }).map(t => t.id), ['RT-001', 'RT-005']);
  assert.deepEqual(filterTasks(tasks, { status: 'Done', assignee: 'Engineer' }), []);
  assert.deepEqual(filterTasks(tasks, emptyFilters), tasks);
});

test('assignee options retain the first spelling and order after trimming', () => {
  assert.deepEqual(normalizeAssignees([' Lia ', 'ANA', 'lia', 'Ana ', '  ']), ['Lia', 'ANA']);
});
