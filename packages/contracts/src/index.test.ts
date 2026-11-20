import test from 'node:test';
import assert from 'node:assert/strict';
import { purchases, filterPurchases, emptyFilters } from './index';

test('fictional receipt totals reconcile after discounts', () => {
  for (const p of purchases)
    assert.equal(
      p.items.reduce((n, i) => n + i.quantity * i.unitPriceCents, 0) -
        p.discountCents,
      p.paidCents,
      p.id,
    );
  assert.equal(
    purchases.reduce((n, p) => n + p.paidCents, 0),
    682040,
  );
});
test('room and supplier intersect, and clearing restores the ledger', () => {
  assert.deepEqual(
    filterPurchases(purchases, {
      room: 'Kitchen',
      supplier: 'Clay Studio',
    }).map((p) => p.id),
    ['FL-008'],
  );
  assert.deepEqual(
    filterPurchases(purchases, { room: 'Bedroom', supplier: 'Clay Studio' }),
    [],
  );
  assert.deepEqual(filterPurchases(purchases, emptyFilters), purchases);
});
