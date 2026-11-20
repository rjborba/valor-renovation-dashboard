import assert from 'node:assert/strict';
import test from 'node:test';
import { purchases, type Purchase } from '@valor/contracts';
import {
  createPurchaseRepository,
  purchaseRepository,
  purchaseStorageKey,
  type PurchaseRepository,
} from '@valor/contracts/storage';

class MemoryStorage {
  raw: string | null = null;
  writes = 0;

  getItem(key: string) {
    assert.equal(key, purchaseStorageKey);
    return this.raw;
  }

  setItem(key: string, value: string) {
    assert.equal(key, purchaseStorageKey);
    this.raw = value;
    this.writes++;
  }
}

const newPurchase: Purchase = {
  ...purchases[0],
  id: 'test-receipt',
  paidCents: 1825,
  discountCents: 50,
  items: [{ name: 'Timber (m)', quantity: 1.5, unitPriceCents: 1250 }],
};

test('the default export instance lazily seeds browser storage and preserves an empty ledger', async (t) => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage, navigator: {} },
  });
  t.after(() => Reflect.deleteProperty(globalThis, 'window'));
  const repo: PurchaseRepository = purchaseRepository;
  const initial = await repo.list();
  assert.equal(initial.length, 8);
  assert.deepEqual(initial, purchases);
  assert.deepEqual(JSON.parse(storage.raw!), purchases);
  assert.deepEqual(await repo.list(), purchases);
  assert.equal(storage.writes, 1);
  for (const { id } of initial) await repo.remove(id);
  assert.equal(storage.raw, '[]');
  assert.deepEqual(await createPurchaseRepository(storage).list(), []);
  assert.equal(storage.writes, 9);
});

test('instances return and persist full records on add, update and remove', async () => {
  const storage = new MemoryStorage();
  const first = createPurchaseRepository(storage);
  const second = createPurchaseRepository(storage);
  assert.deepEqual(await first.add(newPurchase), [newPurchase, ...purchases]);
  const edit = { ...purchases[1], room: 'Workshop', discountCents: 37, paidCents: 400, items: [] };
  const expected = [newPurchase, ...purchases];
  expected[2] = edit;
  assert.deepEqual(await second.update(edit), expected);
  assert.deepEqual(await createPurchaseRepository(storage).list(), expected);
  assert.deepEqual(JSON.parse(storage.raw!), expected);
  assert.deepEqual(await first.remove(newPurchase.id), expected.slice(1));
  assert.deepEqual(await second.list(), expected.slice(1));
});

test('invalid inputs, duplicate adds and missing updates reject without writing', async () => {
  const storage = new MemoryStorage();
  const repo = createPurchaseRepository(storage);
  for (const bad of [
    { id: ' ' }, { date: '2026-02-30' }, { supplier: null }, { room: '' }, { description: 0 },
    { discountCents: -1 }, { paidCents: 1.5 }, { paidCents: Number.MAX_SAFE_INTEGER + 1 },
    { items: null }, { items: [{ ...newPurchase.items[0], quantity: 0 }] },
    { items: [{ ...newPurchase.items[0], quantity: Infinity }] },
    { items: [{ ...newPurchase.items[0], unitPriceCents: 1.25 }] },
    { items: [{ ...newPurchase.items[0], name: '' }] },
  ]) {
    const invalid = { ...purchases[0], ...bad } as Purchase;
    await assert.rejects(repo.add(invalid), /Invalid purchase/);
    await assert.rejects(repo.update(invalid), /Invalid purchase/);
  }
  await assert.rejects(repo.add(purchases[0]), /Duplicate/);
  await assert.rejects(repo.update(newPurchase), /does not exist/);
  await assert.rejects(repo.remove(''), /Invalid purchase ID/);
  assert.equal(storage.raw, null);
  await repo.list();
  await assert.rejects(repo.add(purchases[0]), /Duplicate/);
  await assert.rejects(repo.update(newPurchase), /does not exist/);
  assert.equal(storage.writes, 1);
  assert.deepEqual(await repo.list(), purchases);
});

test('malformed, invalid or duplicate stored records survive every rejected operation', async () => {
  const storage = new MemoryStorage();
  const repo = createPurchaseRepository(storage);
  for (const raw of [
    '', '[', 'null', '{}', '[null]', JSON.stringify([{ ...newPurchase, items: [{}] }]),
    JSON.stringify([newPurchase, newPurchase]),
  ]) {
    storage.raw = raw;
    await assert.rejects(repo.list());
    await assert.rejects(repo.add(newPurchase));
    await assert.rejects(repo.update(newPurchase));
    await assert.rejects(repo.remove(newPurchase.id));
    assert.equal(storage.raw, raw);
  }
  assert.equal(storage.writes, 0);
});

test('storage errors reject, preserve the last saved data and allow retry', async (t) => {
  const storage = new MemoryStorage();
  const repo = createPurchaseRepository(storage);
  const failedRead = t.mock.method(storage, 'getItem', () => { throw new Error('denied'); });
  await assert.rejects(repo.list(), /denied/);
  assert.equal(storage.writes, 0);
  failedRead.mock.restore();
  const failedWrite = t.mock.method(storage, 'setItem', () => { throw new Error('quota'); });
  await assert.rejects(repo.list(), /quota/);
  assert.equal(storage.raw, null);
  storage.raw = JSON.stringify(purchases);
  await assert.rejects(repo.add(newPurchase), /quota/);
  await assert.rejects(repo.update({ ...purchases[0], room: 'Workshop' }), /quota/);
  await assert.rejects(repo.remove(purchases[0].id), /quota/);
  assert.equal(storage.raw, JSON.stringify(purchases));
  failedWrite.mock.restore();
  assert.deepEqual(await repo.add(newPurchase), [newPurchase, ...purchases]);
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
  const first = createPurchaseRepository(storage, locks);
  const second = createPurchaseRepository(storage, locks);
  const edit = { ...newPurchase, paidCents: 2000 };
  const pending = Promise.all([
    first.list(),
    second.add(newPurchase),
    first.update(edit),
    second.remove(purchases[0].id),
  ]);
  assert.deepEqual(calls, Array(4).fill(purchaseStorageKey));
  assert.equal(storage.raw, null);
  // A holder changes the ledger while these requests wait for the lock.
  storage.raw = JSON.stringify([purchases[0]]);
  grant();
  assert.deepEqual(await pending, [
    [purchases[0]], [newPurchase, purchases[0]], [edit, purchases[0]], [edit],
  ]);
  assert.deepEqual(await first.list(), [edit]);
});
