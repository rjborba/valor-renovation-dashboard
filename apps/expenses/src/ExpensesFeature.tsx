import { useId } from 'react';
import {
  emptyFilters,
  filterPurchases,
  formatBRL,
  type ExpensesFeatureProps,
  type Purchase,
} from '@valor/contracts';
import './expenses.css';

const purchaseDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const quantityFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 20 });

function formatPurchaseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : purchaseDateFormat.format(date);
}

function PurchaseDetails({ purchase }: { purchase: Purchase }) {
  return (
    <details className="expenses-ledger__purchase">
      <summary className="expenses-ledger__row expenses-ledger__summary">
        <time className="expenses-ledger__date" dateTime={purchase.date}>
          {formatPurchaseDate(purchase.date)}
        </time>
        <span className="expenses-ledger__purchase-info">
          <span className="expenses-ledger__description">{purchase.description}</span>
          <span className="expenses-ledger__supplier">
            <span className="expenses-ledger__visually-hidden">Supplier: </span>
            {purchase.supplier}
          </span>
        </span>
        <span className="expenses-ledger__room">
          <span className="expenses-ledger__visually-hidden">Room: </span>
          {purchase.room}
        </span>
        <span className="expenses-ledger__amount">
          <span className="expenses-ledger__visually-hidden">Actual paid: </span>
          {formatBRL(purchase.paidCents)}
        </span>
        <span className="expenses-ledger__disclosure" aria-hidden="true" />
      </summary>

      <div className="expenses-ledger__details">
        {purchase.items.length > 0 ? (
          <table className="expenses-ledger__items">
            <caption>Line items</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Qty</th>
                <th scope="col">Unit price</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item, index) => (
                <tr key={index}>
                  <th scope="row">{item.name}</th>
                  <td>{quantityFormat.format(item.quantity)}</td>
                  <td>{formatBRL(item.unitPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="expenses-ledger__no-items">No line items recorded.</p>
        )}
        <dl className="expenses-ledger__payment">
          <div>
            <dt>Discount</dt>
            <dd>{formatBRL(0 - purchase.discountCents)}</dd>
          </div>
          <div className="expenses-ledger__payment-total">
            <dt>Actual paid</dt>
            <dd>{formatBRL(purchase.paidCents)}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

export default function ExpensesFeature({
  purchases,
  rooms,
  suppliers,
  filters,
  onFiltersChange,
}: ExpensesFeatureProps) {
  const headingId = useId();
  const hasFilters = filters.room !== '' || filters.supplier !== '';
  const visiblePurchases = filterPurchases(purchases, filters).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const totalPaid = visiblePurchases.reduce((total, purchase) => total + purchase.paidCents, 0);
  const purchaseCount = visiblePurchases.length;

  return (
    <section className="expenses-ledger" aria-labelledby={headingId}>
      <header className="expenses-ledger__heading">
        <h2 id={headingId}>Purchase ledger</h2>
        <dl className="expenses-ledger__total">
          <dt>Total paid</dt>
          <dd>{formatBRL(totalPaid)}</dd>
        </dl>
      </header>

      <div className="expenses-ledger__filters" role="group" aria-label="Purchase filters">
        <label className="expenses-ledger__filter">
          <span>Room</span>
          <select
            value={filters.room}
            onChange={(event) => onFiltersChange({ ...filters, room: event.currentTarget.value })}
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        </label>
        <label className="expenses-ledger__filter">
          <span>Supplier</span>
          <select
            value={filters.supplier}
            onChange={(event) => onFiltersChange({ ...filters, supplier: event.currentTarget.value })}
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="expenses-ledger__clear"
          aria-disabled={!hasFilters}
          onClick={() => {
            if (hasFilters) onFiltersChange({ ...emptyFilters });
          }}
        >
          Clear filters
        </button>
      </div>

      <p className="expenses-ledger__count" role="status">
        {purchaseCount} {purchaseCount === 1 ? 'purchase' : 'purchases'}
      </p>

      {purchaseCount > 0 ? (
        <div className="expenses-ledger__records">
          <div className="expenses-ledger__row expenses-ledger__columns" aria-hidden="true">
            <span>Date</span>
            <span>Purchase</span>
            <span>Room</span>
            <span className="expenses-ledger__amount">Paid</span>
          </div>
          <ul className="expenses-ledger__list" role="list">
            {visiblePurchases.map((purchase) => (
              <li key={purchase.id}>
                <PurchaseDetails purchase={purchase} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="expenses-ledger__empty">
          <h3>{hasFilters ? 'No matching purchases' : 'No purchases recorded'}</h3>
          {hasFilters && <p>Choose a different room or supplier, or clear the filters.</p>}
        </div>
      )}
    </section>
  );
}
