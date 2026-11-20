import { deepStrictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import type { Purchase } from '@valor/contracts';
import { aggregateSpending } from './aggregateSpending';

const kitchenPurchase: Purchase = {
  id: 'kitchen-1',
  date: '2026-11-19',
  supplier: 'Workshop Supply',
  room: 'Kitchen',
  description: 'Tile supplies',
  paidCents: 10_125,
  discountCents: 375,
  items: [
    { name: 'Tile', quantity: 2, unitPriceCents: 4_000 },
    { name: 'Grout', quantity: 1, unitPriceCents: 2_500 },
  ],
};

test('sums paid cents once per included purchase, even with items and discounts', () => {
  const secondKitchenPurchase = { ...kitchenPurchase, id: 'kitchen-2', paidCents: 875, items: [] };
  const studyPurchase = { ...kitchenPurchase, id: 'study-1', room: 'Study', paidCents: 3_250 };
  const filteredPurchases = Object.freeze([studyPurchase, kitchenPurchase, secondKitchenPurchase]);

  deepStrictEqual(aggregateSpending(filteredPurchases), {
    totalPaidCents: 14_250,
    purchaseCount: 3,
    rooms: [
      { room: 'Kitchen', paidCents: 11_000 },
      { room: 'Study', paidCents: 3_250 },
    ],
  });
});

test('orders equal room totals by name and retains purchases with zero paid', () => {
  deepStrictEqual(aggregateSpending([
    { ...kitchenPurchase, id: 'study-1', room: 'Study' },
    { ...kitchenPurchase, id: 'hall-1', room: 'Hall', paidCents: 0 },
    kitchenPurchase,
  ]), {
    totalPaidCents: 20_250,
    purchaseCount: 3,
    rooms: [
      { room: 'Kitchen', paidCents: 10_125 },
      { room: 'Study', paidCents: 10_125 },
      { room: 'Hall', paidCents: 0 },
    ],
  });
});

test('includes signed paid amounts in room and overall totals', () => {
  deepStrictEqual(aggregateSpending([
    { ...kitchenPurchase, id: 'study-1', room: 'Study', paidCents: -250 },
    kitchenPurchase,
  ]), {
    totalPaidCents: 9_875,
    purchaseCount: 2,
    rooms: [
      { room: 'Kitchen', paidCents: 10_125 },
      { room: 'Study', paidCents: -250 },
    ],
  });
});

test('returns zero totals and no room rows for an empty filter result', () => {
  deepStrictEqual(aggregateSpending([]), {
    totalPaidCents: 0,
    purchaseCount: 0,
    rooms: [],
  });
});
