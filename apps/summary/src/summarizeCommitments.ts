import type { RenovationTask, TaskStatus } from '@valor/contracts';

export function summarizeCommitments(tasks: readonly RenovationTask[]) {
  const counts: Record<TaskStatus, number> = { Open: 0, 'In progress': 0, Done: 0 };

  for (const task of tasks) {
    counts[task.status] += 1;
  }

  return { total: tasks.length, counts };
}
