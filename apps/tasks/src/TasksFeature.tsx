import { useId, useRef, useState } from 'react';
import {
  emptyFilters,
  taskStatuses,
  type RenovationTask,
  type TaskStatus,
  type TasksFeatureProps,
} from '@valor/contracts';
import TaskDialog, { type TaskAction } from './TaskDialog';
import './tasks.css';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function TaskRow({
  task,
  open,
}: {
  task: RenovationTask;
  open: (action: TaskAction, trigger: HTMLButtonElement) => void;
}) {
  const titleId = useId();

  return (
    <article className="task-board__card" aria-labelledby={titleId}>
      <div className="task-board__card-copy">
        <h3 id={titleId}>{task.description}</h3>
        <ul className="task-board__owners" aria-label="Assignees" role="list">
          {task.assignees.map((assignee) => <li key={assignee}>{assignee}</li>)}
        </ul>
      </div>
      <div className="task-board__card-meta">
        <span className="task-board__status" data-status={task.status}>{task.status}</span>
        <dl className="task-board__date">
          <dt>Promised due date</dt>
          <dd>
            <time dateTime={task.dueDate}>{dateFormat.format(new Date(task.dueDate))}</time>
          </dd>
        </dl>
      </div>
      <div className="task-board__row-actions">
        <button
          type="button"
          aria-label={`Edit task: ${task.description}`}
          onClick={(event) => open({ kind: 'edit', task }, event.currentTarget)}
        >
          Edit task
        </button>
        <button
          type="button"
          className="task-board__delete-link"
          aria-label={`Delete task: ${task.description}`}
          onClick={(event) => open({ kind: 'delete', task }, event.currentTarget)}
        >
          Delete task
        </button>
      </div>
    </article>
  );
}

export default function TasksFeature({
  tasks,
  assignees,
  filters,
  onFiltersChange,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
}: TasksFeatureProps) {
  const headingId = useId();
  const statusId = useId();
  const assigneeId = useId();
  const addButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [action, setAction] = useState<TaskAction | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const hasFilters = Boolean(filters.status || filters.assignee);

  function openDialog(next: TaskAction, opener: HTMLButtonElement) {
    trigger.current = opener;
    setAnnouncement('');
    setAction(next);
  }

  function closeDialog(message = '') {
    setAction(null);
    setAnnouncement(message);
    requestAnimationFrame(() => {
      const opener = trigger.current;
      (opener?.isConnected ? opener : addButton.current)?.focus();
    });
  }

  return (
    <section className="task-board" aria-labelledby={headingId}>
      <header className="task-board__heading">
        <h2 id={headingId}>Task board</h2>
        <button
          ref={addButton}
          className="task-board__primary"
          type="button"
          onClick={(event) => openDialog({ kind: 'add' }, event.currentTarget)}
        >
          Add task
        </button>
      </header>

      <div className="task-board__filters" role="group" aria-label="Task filters">
        <div className="task-board__field">
          <label htmlFor={statusId}>Status</label>
          <select
            id={statusId}
            value={filters.status}
            onChange={(event) => onFiltersChange({ ...filters, status: event.currentTarget.value as TaskStatus | '' })}
          >
            <option value="">All statuses</option>
            {taskStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <div className="task-board__field">
          <label htmlFor={assigneeId}>Assignee</label>
          <select
            id={assigneeId}
            value={filters.assignee}
            onChange={(event) => onFiltersChange({ ...filters, assignee: event.currentTarget.value })}
          >
            <option value="">All assignees</option>
            {assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}
          </select>
        </div>
        <button
          type="button"
          aria-disabled={!hasFilters}
          onClick={() => {
            if (hasFilters) onFiltersChange({ ...emptyFilters });
          }}
        >
          Clear filters
        </button>
      </div>

      <p className="task-board__count" role="status">
        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
      </p>
      <div className="task-board__visually-hidden" role="status">{announcement}</div>

      {tasks.length > 0 ? (
        <ul className="task-board__list" role="list">
          {tasks.map((task) => (
            <li key={task.id}><TaskRow task={task} open={openDialog} /></li>
          ))}
        </ul>
      ) : (
        <div className="task-board__empty">
          <h3>{hasFilters ? 'No matching tasks' : 'No tasks yet'}</h3>
          {hasFilters && <p>Choose a different status or assignee, or clear the filters.</p>}
        </div>
      )}

      {action && (
        <TaskDialog
          action={action}
          assignees={assignees}
          addTask={onAddTask}
          updateTask={onUpdateTask}
          removeTask={onRemoveTask}
          close={closeDialog}
        />
      )}
    </section>
  );
}
