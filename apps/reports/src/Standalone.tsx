import { PurchaseLedger } from '@valor/ledger';
import ReportsFeature from './ReportsFeature';

export default function Standalone() {
  return (
    <main className="valor-reports-page">
      <div className="valor-reports-page__content">
        <h1>Renovation Tracker</h1>
        <PurchaseLedger>
          {(ledger) => <ReportsFeature purchases={ledger.purchases} />}
        </PurchaseLedger>
      </div>
    </main>
  );
}
