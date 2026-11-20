import type { Purchase } from '@valor/contracts';

export function aggregateSpending(purchases: readonly Purchase[]) {
  let totalPaidCents = 0;
  const paidByRoom = new Map<string, number>();

  for (const { room, paidCents } of purchases) {
    totalPaidCents += paidCents;
    paidByRoom.set(room, (paidByRoom.get(room) ?? 0) + paidCents);
  }

  const rooms = Array.from(paidByRoom, ([room, paidCents]) => ({ room, paidCents }));
  rooms.sort((a, b) => b.paidCents - a.paidCents || a.room.localeCompare(b.room, 'en'));

  return { totalPaidCents, purchaseCount: purchases.length, rooms };
}
