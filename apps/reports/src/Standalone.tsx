import { TaskBoard } from '@valor/task-board';
import ReportsFeature from './ReportsFeature';

export default function Standalone() {
  return (
    <main className="valor-reports-page">
      <div className="valor-reports-page__content">
        <h1>Renovation Tracker</h1>
        <TaskBoard>
          {({ tasks }) => <ReportsFeature tasks={tasks} />}
        </TaskBoard>
      </div>
    </main>
  );
}
