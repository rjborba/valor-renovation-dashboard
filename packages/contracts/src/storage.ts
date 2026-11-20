import { purchases, type Purchase, type PurchaseItem } from './index';

export interface PurchaseRepository {
  list(): Promise<readonly Purchase[]>;
  add(purchase: Purchase): Promise<readonly Purchase[]>;
  update(purchase: Purchase): Promise<readonly Purchase[]>;
  remove(id: string): Promise<readonly Purchase[]>;
}

export const purchaseStorageKey = 'valor:renovation-tracker:purchases:v1';

type PurchaseStorage = Pick<Storage, 'getItem' | 'setItem'>;
type PurchaseLocks = {
  request<T>(name: string, action: () => T): Promise<T>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isCents(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isItem(value: unknown): value is PurchaseItem {
  return (
    isRecord(value) &&
    isText(value.name) &&
    typeof value.quantity === 'number' &&
    Number.isFinite(value.quantity) &&
    value.quantity > 0 &&
    isCents(value.unitPriceCents)
  );
}

function isPurchase(value: unknown): value is Purchase {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isDate(value.date) &&
    isText(value.supplier) &&
    isText(value.room) &&
    isText(value.description) &&
    isCents(value.paidCents) &&
    isCents(value.discountCents) &&
    Array.isArray(value.items) &&
    Array.from(value.items).every(isItem)
  );
}

function copyPurchase(purchase: Purchase): Purchase {
  const record = structuredClone(purchase);
  if (!isPurchase(record)) throw new Error('Invalid purchase.');
  return record;
}

function readPurchases(raw: string): Purchase[] {
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows) || !rows.every(isPurchase)) {
    throw new Error('Invalid stored purchase data.');
  }
  if (new Set(rows.map((row) => row.id)).size !== rows.length) {
    throw new Error('Duplicate stored purchase ID.');
  }
  return rows;
}

export function createPurchaseRepository(
  storage?: PurchaseStorage,
  locks?: PurchaseLocks,
): PurchaseRepository {
  async function access(
    update: (current: readonly Purchase[]) => readonly Purchase[],
  ): Promise<readonly Purchase[]> {
    // Seed-on-read is also a mutation. Keep the whole read/modify/write inside the lock.
    function run() {
      const target = storage ?? window.localStorage;
      const raw = target.getItem(purchaseStorageKey);
      const current = raw === null ? structuredClone(purchases) : readPurchases(raw);
      const next = update(current);
      if (raw === null || next !== current) {
        target.setItem(purchaseStorageKey, JSON.stringify(next));
      }
      return next;
    }

    const manager = locks ?? (typeof window === 'undefined' ? undefined : window.navigator.locks);
    return manager ? manager.request(purchaseStorageKey, run) : run();
  }

  return {
    list: () => access((current) => current),
    async add(purchase) {
      const record = copyPurchase(purchase);
      return access((current) => {
        if (current.some((row) => row.id === record.id)) throw new Error('Duplicate purchase ID.');
        return [record, ...current];
      });
    },
    async update(purchase) {
      const record = copyPurchase(purchase);
      return access((current) => {
        const index = current.findIndex((row) => row.id === record.id);
        if (index < 0) throw new Error('Purchase ID does not exist.');
        const rows = [...current];
        rows[index] = record;
        return rows;
      });
    },
    async remove(id) {
      if (!isText(id)) throw new Error('Invalid purchase ID.');
      return access((current) => {
        if (!current.some((row) => row.id === id)) return current;
        return current.filter((row) => row.id !== id);
      });
    },
  };
}

// Resolve browser APIs on first use so the package can also be imported in Node.
export const purchaseRepository = createPurchaseRepository();
