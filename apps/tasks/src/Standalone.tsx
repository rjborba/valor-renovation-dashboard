import { useState } from 'react';
import { emptyFilters, normalizeAssignees, tasks, type RenovationTask } from '@valor/contracts';
import { Card } from '@valor/ui';
import TasksFeature from './TasksFeature';

export default function Standalone() {
  const [records, setRecords] = useState<readonly RenovationTask[]>(tasks);
  const assignees = normalizeAssignees(records.flatMap(task => task.assignees)).sort();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-8">
          <h1 className="text-sm font-semibold tracking-tight">Renovation Tracker</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        <Card className="overflow-hidden rounded-lg p-0 shadow-none">
          <TasksFeature
            tasks={records}
            assignees={assignees}
            filters={emptyFilters}
            onAddTask={async task => { setRecords(current => [task, ...current]); }}
            onUpdateTask={async task => { setRecords(current => current.map(row => row.id === task.id ? task : row)); }}
            onRemoveTask={async id => { setRecords(current => current.filter(row => row.id !== id)); }}
          />
        </Card>
      </main>
    </div>
  );
}
