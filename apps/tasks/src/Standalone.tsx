import { TaskBoard } from '@valor/task-board';
import TasksFeature from './TasksFeature';

export default function Standalone() {
  return (
    <div className="tasks-standalone">
      <header className="tasks-standalone__header">
        <h1>Renovation Tracker</h1>
      </header>
      <main className="tasks-standalone__main">
        <TaskBoard>{(board) => <TasksFeature {...board} />}</TaskBoard>
      </main>
    </div>
  );
}
