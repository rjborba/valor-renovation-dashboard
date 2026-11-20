import {
  Component,
  lazy,
  Suspense,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { PurchaseLedger } from '@valor/ledger';
import type { PurchaseRepository } from '@valor/contracts/storage';
import { retryRemote } from './retryRemote';
import './dashboard.css';

const loadExpenses = () => import('expenses/ExpensesFeature');
const loadReports = () => import('reports/ReportsFeature');

class FeatureBoundary extends Component<
  { name: string; retry: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="feature-message" role="alert">
          <h2>{this.props.name} is unavailable</h2>
          <p>Your current filters are saved for this session.</p>
          <button onClick={this.props.retry}>Retry {this.props.name}</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RemoteFeature<P extends object>({
  name,
  moduleId,
  load,
  featureProps,
}: {
  name: string;
  moduleId: string;
  load: () => Promise<{ default: ComponentType<P> }>;
  featureProps: P;
}) {
  const [attempt, setAttempt] = useState(() => ({
    id: 0,
    Feature: lazy(load),
  }));
  const retry = () =>
    setAttempt((current) => ({
      id: current.id + 1,
      Feature: lazy(() => retryRemote<{ default: ComponentType<P> }>(moduleId)),
    }));
  const Feature = attempt.Feature as ComponentType<P>;
  return (
    <FeatureBoundary key={attempt.id} name={name} retry={retry}>
      <Suspense
        fallback={
          <div className="feature-message" role="status">
            Loading {name}…
          </div>
        }
      >
        <Feature {...featureProps} />
      </Suspense>
    </FeatureBoundary>
  );
}

export default function App({
  repository,
}: {
  repository?: PurchaseRepository;
}) {
  return (
    <>
      <a href="#overview" className="skip">
        Skip to dashboard
      </a>
      <header className="masthead">
        <div className="shell masthead-line">
          <span className="wordmark">
            <i aria-hidden="true" />
            Renovation Tracker
          </span>
        </div>
      </header>
      <main id="overview" className="shell">
        <div className="intro">
          <h1>
            Spending overview<span>.</span>
          </h1>
          <p className="period">
            <span>Reporting period</span>All dates
          </p>
        </div>
        <PurchaseLedger repository={repository}>
          {(ledger) => (
            <div className="features">
              <div>
                <RemoteFeature
                  name="Expenses"
                  moduleId="expenses/ExpensesFeature"
                  load={loadExpenses}
                  featureProps={ledger}
                />
              </div>
              <aside>
                <RemoteFeature
                  name="Reports"
                  moduleId="reports/ReportsFeature"
                  load={loadReports}
                  featureProps={{ purchases: ledger.purchases }}
                />
              </aside>
            </div>
          )}
        </PurchaseLedger>
      </main>
      <footer className="shell">
        <span>Renovation Tracker</span>
        <span>Brazilian reais (BRL)</span>
      </footer>
    </>
  );
}
