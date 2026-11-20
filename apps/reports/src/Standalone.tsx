import { TaskBoard } from '@valor/task-board';
import ReportsFeature from './ReportsFeature';

export default function Standalone() {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-4">
        <h1 className="m-0 text-xl font-semibold tracking-tight sm:text-2xl">Renovation Tracker</h1>
        <TaskBoard>
          {({ tasks }) => (
            <div className="rounded-lg border border-border bg-card">
              <ReportsFeature tasks={tasks} />
            </div>
          )}
        </TaskBoard>
      </div>
    </main>
  );
}
