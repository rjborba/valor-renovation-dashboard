import type { Purchase } from '@valor/contracts';
import type { PurchaseRepository } from '@valor/contracts/storage';

let rows: readonly Purchase[] = [{
  id: 'memory-only', description: 'In-memory receipt', date: '2026-11-20',
  supplier: 'Test supplier', room: 'Workshop', paidCents: 777, discountCents: 0, items: [],
}];

const repository: PurchaseRepository = {
  async list() { return rows; },
  async add(purchase) { return rows = [purchase, ...rows]; },
  async update(purchase) { return rows = rows.map(row => row.id === purchase.id ? purchase : row); },
  async remove(id) { return rows = rows.filter(row => row.id !== id); },
};

async function mount() {
  const [{ createRoot }, { createElement }, { default: App }] = await Promise.all([
    import('react-dom/client'), import('react'), import('../../apps/dashboard/src/App'),
  ]);
  createRoot(document.getElementById('root')!).render(createElement(App, { repository }));
}

void mount();
