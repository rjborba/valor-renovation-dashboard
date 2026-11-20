import { useEffect, useState, type ReactNode } from 'react';
import {
  emptyFilters,
  filterPurchases,
  type ExpensesFeatureProps,
  type Purchase,
} from '@valor/contracts';
import {
  purchaseRepository,
  type PurchaseRepository,
} from '@valor/contracts/storage';

export function PurchaseLedger({
  repository = purchaseRepository,
  children,
}: {
  repository?: PurchaseRepository;
  children: (ledger: ExpensesFeatureProps) => ReactNode;
}) {
  const [records, setRecords] = useState<readonly Purchase[] | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError('');
    setRecords(null);
    repository.list().then(
      (rows) => {
        if (active) setRecords(rows);
      },
      (error) => {
        if (active)
          setLoadError(
            error instanceof Error ? error.message : 'Please try again.',
          );
      },
    );
    return () => {
      active = false;
    };
  }, [repository, attempt]);

  if (loadError)
    return (
      <div role="alert" className="feature-message">
        <h2>Could not open your purchase ledger</h2>
        <p>{loadError}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>
          Retry loading purchases
        </button>
      </div>
    );
  if (records === null) return <p role="status">Loading purchases…</p>;

  function reveal(purchase: Purchase) {
    setFilters((current) => ({
      room: current.room === purchase.room ? current.room : '',
      supplier: current.supplier === purchase.supplier ? current.supplier : '',
    }));
  }

  return children({
    rooms: [...new Set(records.map((p) => p.room))].sort(),
    suppliers: [...new Set(records.map((p) => p.supplier))].sort(),
    filters,
    purchases: filterPurchases(records, filters),
    onFiltersChange: setFilters,
    onAddPurchase: async (purchase) => {
      setRecords(await repository.add(purchase));
      reveal(purchase);
    },
    onUpdatePurchase: async (purchase) => {
      setRecords(await repository.update(purchase));
      reveal(purchase);
    },
    onRemovePurchase: async (id) => {
      const rows = await repository.remove(id);
      setRecords(rows);
      setFilters((current) => ({
        room: rows.some((p) => p.room === current.room) ? current.room : '',
        supplier: rows.some((p) => p.supplier === current.supplier)
          ? current.supplier
          : '',
      }));
    },
  });
}
