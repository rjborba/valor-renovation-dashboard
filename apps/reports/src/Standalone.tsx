import { purchases } from '@valor/contracts';
import ReportsFeature from './ReportsFeature';

export default function Standalone() {
  return (
    <main className="valor-reports-page">
      <div className="valor-reports-page__content">
        <h1>Field Ledger</h1>
        <ReportsFeature purchases={purchases} />
      </div>
    </main>
  );
}
