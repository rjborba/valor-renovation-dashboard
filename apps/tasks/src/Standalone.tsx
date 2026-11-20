import { TaskBoard } from '@valor/task-board';
import { Card } from '@valor/ui';
import TasksFeature from './TasksFeature';

export default function Standalone() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-8">
          <h1 className="text-sm font-semibold tracking-tight">Renovation Tracker</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        <TaskBoard>
          {(board) => (
            <Card className="overflow-hidden rounded-lg p-0 shadow-none">
              <TasksFeature {...board} />
            </Card>
          )}
        </TaskBoard>
      </main>
    </div>
  );
}
