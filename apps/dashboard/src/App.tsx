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
import { Button } from '@valor/ui';
import '@valor/ui/styles.css';

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
        <div className="space-y-3 p-5 text-sm" role="alert">
          <h2 className="font-semibold">{this.props.name} is unavailable</h2>
          <p className="text-muted-foreground">Your current filters are saved for this session.</p>
          <Button variant="outline" size="sm" onClick={this.props.retry}>Retry {this.props.name}</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const moduleColors = {
  Tasks: { border: 'border-indigo-500', label: 'bg-indigo-50 text-indigo-800' },
  Reports: { border: 'border-teal-600', label: 'bg-teal-50 text-teal-800' },
};

function RemoteFeature<P extends object>({
  name,
  moduleId,
  load,
  featureProps,
}: {
  name: 'Tasks' | 'Reports';
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
  const { border, label } = moduleColors[name];
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-lg border-2 bg-card ${border}`}
      role="group"
      aria-labelledby={labelId}
    >
      <div
        className={`flex flex-wrap items-center gap-x-2 border-b border-inherit px-4 py-2 font-mono text-[11px] ${label}`}
        id={labelId}
      >
        <span className="font-sans">Federated module</span>
        <code>{moduleId}</code>
      </div>
      <FeatureBoundary key={attempt.id} name={name} retry={retry}>
        <Suspense
          fallback={
            <div className="p-5 text-sm text-muted-foreground" role="status">
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
    <div className="min-h-screen bg-background text-foreground antialiased">
      <a href="#overview" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:p-2">
        Skip to dashboard
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8 lg:px-12">
          <span className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-primary">
              <span className="size-3 -rotate-6 rounded-[2px] border border-primary-foreground border-l-[3px]" />
            </span>
            Renovation Tracker
          </span>
          <span className="text-xs text-muted-foreground">Saved in this browser</span>
        </div>
      </header>
      <main id="overview" className="mx-auto max-w-[1440px] px-4 pt-7 pb-12 sm:px-8 sm:pt-10 lg:px-12">
        <h1 className="mb-5 text-2xl font-semibold tracking-tight sm:text-3xl">Renovation tasks</h1>
        <TaskBoard repository={repository}>
          {(board) => (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
              <div className="min-w-0">
                <RemoteFeature
                  name="Tasks"
                  moduleId="tasks/TasksFeature"
                  load={loadTasks}
                  featureProps={board}
                />
              </div>
              <aside className="min-w-0">
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
    </div>
  );
}
