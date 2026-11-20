import { normalizeAssignees, tasks, taskStatuses, type RenovationTask, type TaskStatus } from './index';

export interface TaskRepository {
  list(): Promise<readonly RenovationTask[]>;
  add(task: RenovationTask): Promise<readonly RenovationTask[]>;
  update(task: RenovationTask): Promise<readonly RenovationTask[]>;
  remove(id: string): Promise<readonly RenovationTask[]>;
}

export const taskStorageKey = 'valor:renovation-tracker:tasks:v1';

type TaskStorage = Pick<Storage, 'getItem' | 'setItem'>;
type TaskLocks = {
  request<T>(name: string, action: () => T): Promise<T>;
};

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDueDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function isStatus(value: unknown): value is TaskStatus {
  return taskStatuses.some(status => status === value);
}

function parseTask(value: unknown): RenovationTask {
  if (typeof value !== 'object' || !value) throw new Error('Invalid task.');
  const row = value as Record<string, unknown>;
  if (!isText(row.id) || !isText(row.description) || !isStatus(row.status) || !isDueDate(row.dueDate)) {
    throw new Error('Invalid task description, ID, status or due date.');
  }
  if (!Array.isArray(row.assignees) || !row.assignees.length || !Array.from(row.assignees).every(isText)) {
    throw new Error('A task must have at least one named assignee.');
  }
  return {
    id: row.id,
    description: row.description.trim(),
    status: row.status,
    dueDate: row.dueDate,
    assignees: normalizeAssignees(row.assignees),
  };
}

function readTasks(raw: string): RenovationTask[] {
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values)) throw new Error('Invalid stored task data.');
  const rows = values.map(parseTask);
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate stored task ID.');
  return rows;
}

export function createTaskRepository(storage?: TaskStorage, locks?: TaskLocks): TaskRepository {
  async function access(
    change: (current: readonly RenovationTask[]) => readonly RenovationTask[],
  ): Promise<readonly RenovationTask[]> {
    // Seeding is also a mutation. Read the latest records after acquiring the lock.
    function run() {
      const target = storage ?? window.localStorage;
      const raw = target.getItem(taskStorageKey);
      const current = raw === null ? tasks.map(parseTask) : readTasks(raw);
      const next = change(current);
      if (raw === null || next !== current) target.setItem(taskStorageKey, JSON.stringify(next));
      return next;
    }

    const manager = locks ?? (typeof window === 'undefined' ? undefined : window.navigator.locks);
    return manager ? manager.request(taskStorageKey, run) : run();
  }

  return {
    list: () => access(current => current),
    async add(task) {
      const record = parseTask(task);
      return access(current => {
        if (current.some(row => row.id === record.id)) throw new Error('Duplicate task ID.');
        return [record, ...current];
      });
    },
    async update(task) {
      const record = parseTask(task);
      return access(current => {
        const index = current.findIndex(row => row.id === record.id);
        if (index < 0) throw new Error('Task ID does not exist.');
        const rows = [...current];
        rows[index] = record;
        return rows;
      });
    },
    async remove(id) {
      if (!isText(id)) throw new Error('Invalid task ID.');
      return access(current => {
        const rows = current.filter(row => row.id !== id);
        return rows.length === current.length ? current : rows;
      });
    },
  };
}

export const taskRepository = createTaskRepository();
