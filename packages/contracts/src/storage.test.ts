import assert from 'node:assert/strict';
import test from 'node:test';
import { tasks, type RenovationTask } from '@valor/contracts';
import {
  createTaskRepository,
  taskRepository,
  taskStorageKey,
  type TaskRepository,
} from '@valor/contracts/storage';

class MemoryStorage {
  raw: string | null = null;
  writes = 0;

  getItem(key: string) {
    assert.equal(key, taskStorageKey);
    return this.raw;
  }

  setItem(key: string, value: string) {
    assert.equal(key, taskStorageKey);
    this.raw = value;
    this.writes++;
  }
}

const newTask: RenovationTask = {
  ...tasks[0],
  id: 'test-task',
  dueDate: '2028-02-29',
  assignees: ['Architect', 'Engineer'],
};

test('the browser repository seeds only the task key and preserves an empty board', async (t) => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage, navigator: {} },
  });
  t.after(() => Reflect.deleteProperty(globalThis, 'window'));
  const repo: TaskRepository = taskRepository;
  const initial = await repo.list();
  assert.notEqual(taskStorageKey, 'valor:renovation-tracker:purchases:v1');
  assert.equal(initial.length, 5);
  assert.deepEqual(initial, tasks);
  assert.deepEqual(JSON.parse(storage.raw!), tasks);
  assert.deepEqual(await repo.list(), tasks);
  assert.equal(storage.writes, 1);
  for (const { id } of initial) await repo.remove(id);
  assert.equal(storage.raw, '[]');
  assert.deepEqual(await createTaskRepository(storage).list(), []);
  assert.equal(storage.writes, initial.length + 1);
});

test('instances return and persist full records on add, update and remove', async () => {
  const storage = new MemoryStorage();
  const first = createTaskRepository(storage);
  const second = createTaskRepository(storage);
  assert.deepEqual(await first.add(newTask), [newTask, ...tasks]);
  const edit: RenovationTask = { ...tasks[1], status: 'Done', assignees: ['Architect', 'Electrician'] };
  const expected = [newTask, ...tasks];
  expected[2] = edit;
  assert.deepEqual(await second.update(edit), expected);
  assert.deepEqual(await createTaskRepository(storage).list(), expected);
  assert.deepEqual(JSON.parse(storage.raw!), expected);
  assert.deepEqual(await first.remove(newTask.id), expected.slice(1));
  assert.deepEqual(await second.list(), expected.slice(1));
});

test('invalid inputs, duplicate adds and missing updates reject without writing', async () => {
  const storage = new MemoryStorage();
  const repo = createTaskRepository(storage);
  for (const bad of [
    { id: ' ' }, { description: 0 }, { description: '  ' }, { status: 'Deferred' },
    { dueDate: '2026-02-29' }, { dueDate: '2024-02-30' }, { dueDate: '2026-11-31' },
    { dueDate: '2026-13-01' }, { dueDate: '0000-01-01' }, { dueDate: '11/20/2026' }, { dueDate: '' },
    { assignees: null }, { assignees: [] }, { assignees: [''] }, { assignees: ['Architect', 7] },
  ]) {
    const invalid = { ...tasks[0], ...bad } as unknown as RenovationTask;
    await assert.rejects(repo.add(invalid));
    await assert.rejects(repo.update(invalid));
  }
  await assert.rejects(repo.add(tasks[0]), /Duplicate/);
  await assert.rejects(repo.update(newTask), /does not exist/);
  await assert.rejects(repo.remove(''), /Invalid task ID/);
  assert.equal(storage.raw, null);
  await repo.list();
  await assert.rejects(repo.add(tasks[0]), /Duplicate/);
  await assert.rejects(repo.update(newTask), /does not exist/);
  assert.equal(storage.writes, 1);
  assert.deepEqual(await repo.list(), tasks);
});

test('malformed, invalid or duplicate stored records survive every rejected operation', async () => {
  const storage = new MemoryStorage();
  const repo = createTaskRepository(storage);
  for (const raw of [
    '', '[', 'null', '{}', '[null]', JSON.stringify([{ ...newTask, assignees: [{}] }]),
    JSON.stringify([newTask, newTask]),
  ]) {
    storage.raw = raw;
    await assert.rejects(repo.list());
    await assert.rejects(repo.add(newTask));
    await assert.rejects(repo.update(newTask));
    await assert.rejects(repo.remove(newTask.id));
    assert.equal(storage.raw, raw);
  }
  assert.equal(storage.writes, 0);
});

test('storage errors reject, preserve the last saved data and allow retry', async (t) => {
  const storage = new MemoryStorage();
  const repo = createTaskRepository(storage);
  const failedRead = t.mock.method(storage, 'getItem', () => { throw new Error('denied'); });
  await assert.rejects(repo.list(), /denied/);
  assert.equal(storage.writes, 0);
  failedRead.mock.restore();
  const failedWrite = t.mock.method(storage, 'setItem', () => { throw new Error('quota'); });
  await assert.rejects(repo.list(), /quota/);
  assert.equal(storage.raw, null);
  storage.raw = JSON.stringify(tasks);
  await assert.rejects(repo.add(newTask), /quota/);
  await assert.rejects(repo.update({ ...tasks[0], description: 'Measure vanity top' }), /quota/);
  await assert.rejects(repo.remove(tasks[0].id), /quota/);
  assert.equal(storage.raw, JSON.stringify(tasks));
  failedWrite.mock.restore();
  assert.deepEqual(await repo.add(newTask), [newTask, ...tasks]);
});

test('instances use one exclusive lock for seeding and concurrent mutations', async () => {
  const storage = new MemoryStorage();
  const calls: string[] = [];
  let grant!: () => void;
  let tail = new Promise<void>((resolve) => { grant = resolve; });
  const locks = {
    request<T>(name: string, action: () => T): Promise<T> {
      calls.push(name);
      const result = tail.then(action);
      tail = result.then(() => {}, () => {});
      return result;
    },
  };
  const first = createTaskRepository(storage, locks);
  const second = createTaskRepository(storage, locks);
  const edit = { ...newTask, dueDate: '2026-12-01' };
  const pending = Promise.all([
    first.list(),
    second.add(newTask),
    first.update(edit),
    second.remove(tasks[0].id),
  ]);
  assert.deepEqual(calls, Array(4).fill(taskStorageKey));
  assert.equal(storage.raw, null);
  // A holder changes the board while these requests wait for the lock.
  storage.raw = JSON.stringify([tasks[0]]);
  grant();
  assert.deepEqual(await pending, [
    [tasks[0]], [newTask, tasks[0]], [edit, tasks[0]], [edit],
  ]);
  assert.deepEqual(await first.list(), [edit]);
});

test('added, edited and stored tasks have trimmed names and one entry per assignee', async () => {
  const storage = new MemoryStorage();
  storage.raw = '[]';
  const repo = createTaskRepository(storage);
  const input = { ...newTask, description: '  Review plans  ', assignees: [' Ana ', 'Rui', 'ana', ' Rui '] };
  const expected = { ...newTask, description: 'Review plans', assignees: ['Ana', 'Rui'] };
  assert.deepEqual(await repo.add(input), [expected]);
  assert.deepEqual(JSON.parse(storage.raw), [expected]);
  assert.deepEqual(input.assignees, [' Ana ', 'Rui', 'ana', ' Rui ']);
  const updated = { ...expected, assignees: ['Engineer'] };
  assert.deepEqual(await repo.update({ ...input, assignees: [' Engineer ', 'ENGINEER'] }), [updated]);
  storage.raw = JSON.stringify([input]);
  assert.deepEqual(await repo.list(), [expected]);
  assert.equal(storage.raw, JSON.stringify([input]));
});
