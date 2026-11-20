import type { RenovationTask, TaskStatus } from '@valor/contracts';

export function summarizeCommitments(tasks: readonly RenovationTask[], today: string) {
  const counts: Record<TaskStatus, number> = { Open: 0, 'In progress': 0, Done: 0 };
  const overdue: RenovationTask[] = [];
  const upcoming: RenovationTask[] = [];

  for (const task of tasks) {
    counts[task.status] += 1;
    if (task.status === 'Done') continue;

    // Stored due dates use YYYY-MM-DD, so text order matches calendar order.
    const deadlines = task.dueDate < today ? overdue : upcoming;
    deadlines.push(task);
  }

  const byDueDate = (a: RenovationTask, b: RenovationTask) => a.dueDate.localeCompare(b.dueDate);
  overdue.sort(byDueDate);
  upcoming.sort(byDueDate);

  return { total: tasks.length, counts, overdue, upcoming };
}
