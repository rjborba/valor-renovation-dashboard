import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  emptyFilters,
  filterTasks,
  normalizeAssignees,
  type RenovationTask,
  type TasksFeatureProps,
} from '@valor/contracts';
import { taskRepository, type TaskRepository } from '@valor/contracts/storage';

export function TaskBoard({
  repository = taskRepository,
  children,
}: {
  repository?: TaskRepository;
  children: (board: TasksFeatureProps) => ReactNode;
}) {
  const [records, setRecords] = useState<readonly RenovationTask[] | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    setLoadError('');
    setRecords(null);
    setFilters(emptyFilters);
    repository.list().then(
      rows => { if (current === generation.current) setRecords(rows); },
      error => {
        if (current === generation.current) {
          setLoadError(error instanceof Error && error.message ? error.message : 'Please try again.');
        }
      },
    );
    return () => { generation.current++; };
  }, [repository, attempt]);

  if (loadError) {
    return (
      <div role="alert" className="feature-message">
        <h2>Could not open your task board</h2>
        <p>{loadError}</p>
        <button onClick={() => setAttempt(n => n + 1)}>Retry loading tasks</button>
      </div>
    );
  }
  if (records === null) return <p role="status">Loading tasks…</p>;

  async function apply(change: Promise<readonly RenovationTask[]>, revealId?: string) {
    const current = generation.current;
    const rows = await change;
    if (current !== generation.current) return;
    setRecords(rows);
    const saved = revealId === undefined ? undefined : rows.find(row => row.id === revealId);
    setFilters(previous => {
      const status = saved && saved.status !== previous.status ? '' : previous.status;
      const owners = saved ? saved.assignees : rows.flatMap(row => row.assignees);
      const assignee = owners.some(name => name.toLowerCase() === previous.assignee.toLowerCase())
        ? previous.assignee : '';
      return { status, assignee };
    });
  }

  const assignees = normalizeAssignees(records.flatMap(task => task.assignees)).sort();
  // A different record can supply the display spelling after an edit or deletion.
  const selected = assignees.find(name => name.toLowerCase() === filters.assignee.toLowerCase()) ?? '';
  const activeFilters = { ...filters, assignee: selected };
  return children({
    tasks: filterTasks(records, activeFilters),
    assignees,
    filters: activeFilters,
    onFiltersChange: setFilters,
    onAddTask: task => apply(repository.add(task), task.id),
    onUpdateTask: task => apply(repository.update(task), task.id),
    onRemoveTask: id => apply(repository.remove(id)),
  });
}
