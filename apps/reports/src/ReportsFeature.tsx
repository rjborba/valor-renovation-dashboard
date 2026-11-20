import { formatBRL, type ReportsFeatureProps } from '@valor/contracts';
import { useId } from 'react';
import { aggregateSpending } from './aggregateSpending';
import './reports.css';

const formatCount = new Intl.NumberFormat('en');

export default function ReportsFeature({ purchases }: ReportsFeatureProps) {
  const headingId = useId();
  const chartHeadingId = useId();
  const { totalPaidCents, purchaseCount, rooms } = aggregateSpending(purchases);

  const metrics = [
    { label: 'Total paid', value: formatBRL(totalPaidCents) },
    { label: 'Purchases', value: formatCount.format(purchaseCount) },
  ];

  const minPaidCents = Math.min(0, rooms[rooms.length - 1]?.paidCents ?? 0);
  const maxPaidCents = Math.max(0, rooms[0]?.paidCents ?? 0);
  const chartRange = maxPaidCents - minPaidCents || 1;
  const zeroPosition = (-minPaidCents / chartRange) * 100;
  const crossesZero = minPaidCents < 0 && maxPaidCents > 0;

  return (
    <section className="valor-reports" aria-labelledby={headingId}>
      <h2 className="valor-reports__heading" id={headingId}>Spending summary</h2>

      <dl className="valor-reports__metrics">
        {metrics.map(({ label, value }) => (
          <div className="valor-reports__metric" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <figure className="valor-reports__chart" aria-labelledby={chartHeadingId}>
        <figcaption id={chartHeadingId}>Spending by room</figcaption>
        {rooms.length === 0 ? (
          <p className="valor-reports__empty">No purchases to show.</p>
        ) : (
          <ul className="valor-reports__rooms" role="list">
            {rooms.map(({ room, paidCents }) => (
              <li className="valor-reports__room" key={room}>
                <div className="valor-reports__room-label">
                  <span>{room.trim() || 'Unassigned room'}</span>{' '}
                  <span className="valor-reports__amount">{formatBRL(paidCents)}</span>
                </div>
                <div className="valor-reports__track" aria-hidden="true">
                  <span
                    className="valor-reports__bar"
                    data-negative={paidCents < 0 ? '' : undefined}
                    style={{
                      insetInlineStart: `${((Math.min(0, paidCents) - minPaidCents) / chartRange) * 100}%`,
                      inlineSize: `${(Math.abs(paidCents) / chartRange) * 100}%`,
                    }}
                  />
                  {crossesZero && (
                    <span className="valor-reports__zero" style={{ insetInlineStart: `${zeroPosition}%` }} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </figure>
    </section>
  );
}
