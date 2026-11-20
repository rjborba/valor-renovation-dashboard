export const taskStatuses = ['Open', 'In progress', 'Done'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export interface RenovationTask {
  id: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  assignees: readonly string[];
}

export interface TaskFilters {
  status: TaskStatus | '';
  assignee: string;
}

export interface ReportsFeatureProps {
  tasks: readonly RenovationTask[];
}

export interface FiltersFeatureProps {
  assignees: readonly string[];
  filters: TaskFilters;
  onFiltersChange(filters: TaskFilters): void;
}

export interface TasksFeatureProps extends ReportsFeatureProps {
  assignees: readonly string[];
  filters: TaskFilters;
  onAddTask(task: RenovationTask): Promise<void>;
  onUpdateTask(task: RenovationTask): Promise<void>;
  onRemoveTask(id: string): Promise<void>;
}

export const emptyFilters: TaskFilters = { status: '', assignee: '' };

export const tasks: readonly RenovationTask[] = [
  {
    id: 'RT-001',
    description: 'Confirm the kitchen island outlet positions before the stone is cut.',
    status: 'In progress',
    dueDate: '2026-11-23',
    assignees: ['Architect', 'Electrician'],
  },
  {
    id: 'RT-002',
    description: 'Check the lintel detail for the widened laundry doorway.',
    status: 'Open',
    dueDate: '2026-11-24',
    assignees: ['Engineer'],
  },
  {
    id: 'RT-003',
    description: 'Measure the vanity top and confirm the basin cutout.',
    status: 'Open',
    dueDate: '2026-11-25',
    assignees: ['Stone contractor'],
  },
  {
    id: 'RT-004',
    description: 'Mark the bedroom reading light heights on site.',
    status: 'Done',
    dueDate: '2026-11-18',
    assignees: ['Electrician'],
  },
  {
    id: 'RT-005',
    description: 'Sign off the shower threshold profile with the fabricator.',
    status: 'In progress',
    dueDate: '2026-11-27',
    assignees: ['Architect', 'Stone contractor'],
  },
];

export function normalizeAssignees(names: readonly string[]): string[] {
  const unique = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()];
}

export function filterTasks(rows: readonly RenovationTask[], filters: TaskFilters): RenovationTask[] {
  const assignee = filters.assignee.trim().toLowerCase();
  return rows.filter(task =>
    (!filters.status || task.status === filters.status) &&
    (!assignee || task.assignees.some(name => name.trim().toLowerCase() === assignee)),
  );
}

export function localDateKey(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
