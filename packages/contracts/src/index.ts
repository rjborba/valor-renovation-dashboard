export interface PurchaseItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
}
export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  room: string;
  description: string;
  paidCents: number;
  discountCents: number;
  items: readonly PurchaseItem[];
}
export interface Filters {
  room: string;
  supplier: string;
}
export interface ReportsFeatureProps {
  purchases: readonly Purchase[];
}
export interface ExpensesFeatureProps extends ReportsFeatureProps {
  rooms: readonly string[];
  suppliers: readonly string[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}
export const emptyFilters: Filters = { room: '', supplier: '' };

// Fictional receipts. Paid is authoritative; details explain the amount paid.
export const purchases: readonly Purchase[] = [
  {
    id: 'FL-008',
    date: '2026-11-18',
    supplier: 'Clay Studio',
    room: 'Kitchen',
    description: 'Handmade backsplash tile',
    paidCents: 116640,
    discountCents: 12960,
    items: [
      { name: 'Glazed field tile · box', quantity: 12, unitPriceCents: 10800 },
    ],
  },
  {
    id: 'FL-007',
    date: '2026-11-16',
    supplier: 'Lumen Works',
    room: 'Living room',
    description: 'Reading lights and dimmers',
    paidCents: 75600,
    discountCents: 0,
    items: [
      { name: 'Wall light', quantity: 2, unitPriceCents: 31500 },
      { name: 'Dimmer', quantity: 2, unitPriceCents: 6300 },
    ],
  },
  {
    id: 'FL-006',
    date: '2026-11-14',
    supplier: 'Forma Supply',
    room: 'Bathroom',
    description: 'Brushed brass basin mixer',
    paidCents: 64900,
    discountCents: 0,
    items: [{ name: 'Basin mixer', quantity: 1, unitPriceCents: 64900 }],
  },
  {
    id: 'FL-005',
    date: '2026-11-12',
    supplier: 'North Mill',
    room: 'Kitchen',
    description: 'Oak shelving and brackets',
    paidCents: 82400,
    discountCents: 0,
    items: [
      { name: 'Oak shelf', quantity: 2, unitPriceCents: 34000 },
      { name: 'Steel bracket', quantity: 4, unitPriceCents: 3600 },
    ],
  },
  {
    id: 'FL-004',
    date: '2026-11-09',
    supplier: 'Clay Studio',
    room: 'Bathroom',
    description: 'Porcelain floor tiles',
    paidCents: 139200,
    discountCents: 0,
    items: [
      { name: 'Porcelain tile · box', quantity: 16, unitPriceCents: 8700 },
    ],
  },
  {
    id: 'FL-003',
    date: '2026-11-07',
    supplier: 'North Mill',
    room: 'Bedroom',
    description: 'Birch wardrobe panels',
    paidCents: 108000,
    discountCents: 12000,
    items: [{ name: 'Birch panel', quantity: 6, unitPriceCents: 20000 }],
  },
  {
    id: 'FL-002',
    date: '2026-11-04',
    supplier: 'Lumen Works',
    room: 'Kitchen',
    description: 'Pendant lighting',
    paidCents: 56400,
    discountCents: 0,
    items: [{ name: 'Opal glass pendant', quantity: 2, unitPriceCents: 28200 }],
  },
  {
    id: 'FL-001',
    date: '2026-11-02',
    supplier: 'Forma Supply',
    room: 'Living room',
    description: 'Limewash and primer',
    paidCents: 38900,
    discountCents: 0,
    items: [
      { name: 'Limewash', quantity: 2, unitPriceCents: 15000 },
      { name: 'Primer', quantity: 1, unitPriceCents: 8900 },
    ],
  },
];
export const rooms = [...new Set(purchases.map((p) => p.room))].sort();
export const suppliers = [...new Set(purchases.map((p) => p.supplier))].sort();
export function filterPurchases(
  rows: readonly Purchase[],
  filters: Filters,
): Purchase[] {
  return rows.filter(
    (p) =>
      (!filters.room || p.room === filters.room) &&
      (!filters.supplier || p.supplier === filters.supplier),
  );
}
const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}
