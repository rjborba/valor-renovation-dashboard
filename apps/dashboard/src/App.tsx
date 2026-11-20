import {
  Component,
  lazy,
  Suspense,
  useId,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { TaskBoard } from '@valor/task-board';
import type { TaskRepository } from '@valor/contracts/storage';
import { retryRemote } from './retryRemote';
import './dashboard.css';

const loadTasks = () => import('tasks/TasksFeature');
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
  const labelId = useId();
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
    <div className="remote-frame" role="group" aria-labelledby={labelId}>
      <div className="remote-label" id={labelId}>
        <span>Federated module</span>
        <code>{moduleId}</code>
      </div>
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
    </div>
  );
}

export default function App({
  repository,
}: {
  repository?: TaskRepository;
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
            Renovation tasks<span>.</span>
          </h1>
        </div>
        <TaskBoard repository={repository}>
          {(board) => (
            <div className="features">
              <div>
                <RemoteFeature
                  name="Tasks"
                  moduleId="tasks/TasksFeature"
                  load={loadTasks}
                  featureProps={board}
                />
              </div>
              <aside>
                <RemoteFeature
                  name="Reports"
                  moduleId="reports/ReportsFeature"
                  load={loadReports}
                  featureProps={{ tasks: board.tasks }}
                />
              </aside>
            </div>
          )}
        </TaskBoard>
      </main>
      <footer className="shell">
        <span>Renovation Tracker</span>
        <span>Saved in this browser</span>
      </footer>
    </>
  );
}
