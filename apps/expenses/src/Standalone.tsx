import { PurchaseLedger } from '@valor/ledger';
import ExpensesFeature from './ExpensesFeature';

export default function Standalone() {
  return (
    <div className="expenses-standalone">
      <header className="expenses-standalone__header">
        <h1>Renovation Tracker</h1>
      </header>
      <main className="expenses-standalone__main">
        <PurchaseLedger>
          {(ledger) => <ExpensesFeature {...ledger} />}
        </PurchaseLedger>
      </main>
    </div>
  );
}
