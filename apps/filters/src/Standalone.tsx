import { useState } from 'react';
import { emptyFilters, normalizeAssignees, tasks } from '@valor/contracts';
import FiltersFeature from './FiltersFeature';

const assignees = normalizeAssignees(tasks.flatMap(task => task.assignees)).sort();

export default function Standalone() {
  const [filters, setFilters] = useState(emptyFilters);

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:py-10">
      <div className="mx-auto grid max-w-sm gap-4">
        <h1 className="m-0 text-xl font-semibold tracking-tight sm:text-2xl">Renovation Tracker</h1>
        <div className="rounded-lg border border-border bg-card">
          <FiltersFeature assignees={assignees} filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>
    </main>
  );
}
