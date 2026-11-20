import { useState } from 'react';
import { emptyFilters, purchases, rooms, suppliers, type Filters } from '@valor/contracts';
import ExpensesFeature from './ExpensesFeature';

export default function Standalone() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  return (
    <div className="expenses-standalone">
      <header className="expenses-standalone__header">
        <h1>Renovation Tracker</h1>
      </header>
      <main className="expenses-standalone__main">
        <ExpensesFeature
          purchases={purchases}
          rooms={rooms}
          suppliers={suppliers}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </main>
    </div>
  );
}
