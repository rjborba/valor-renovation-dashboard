import { useEffect, useRef, useState } from 'react';
import {
  emptyFilters,
  filterTasks,
  normalizeAssignees,
  type FiltersFeatureProps,
  type RenovationTask,
  type TasksFeatureProps,
} from '@valor/contracts';
import type { TaskRepository } from '@valor/contracts/storage';

export function useTaskBoard(repository: TaskRepository) {
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

  const assignees = normalizeAssignees((records ?? []).flatMap(task => task.assignees)).sort();
  // A different record can supply the display spelling after an edit or deletion.
  const selected = assignees.find(name => name.toLowerCase() === filters.assignee.toLowerCase()) ?? '';
  const activeFilters = { ...filters, assignee: selected };
  const board: (TasksFeatureProps & FiltersFeatureProps) | null = records === null ? null : {
    tasks: filterTasks(records, activeFilters),
    assignees,
    filters: activeFilters,
    onFiltersChange: setFilters,
    onAddTask: task => apply(repository.add(task), task.id),
    onUpdateTask: task => apply(repository.update(task), task.id),
    onRemoveTask: id => apply(repository.remove(id)),
  };

  return { board, loadError, retry: () => setAttempt(n => n + 1) };
}
