import { useId, useRef, useState } from 'react';
import {
  emptyFilters,
  taskStatuses,
  type RenovationTask,
  type TaskStatus,
  type TasksFeatureProps,
} from '@valor/contracts';
import { Badge, Button, Card, Label, NativeSelect, NativeSelectOption, TaskStatusSymbol } from '@valor/ui';
import '@valor/ui/styles.css';
import TaskDialog, { type TaskAction } from './TaskDialog';

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
    <article
      className="grid min-w-0 gap-x-3 gap-y-2 py-3 @3xs:grid-cols-[minmax(0,1fr)_auto] @3xs:items-center @lg:items-start @3xl:grid-cols-[minmax(0,1fr)_auto_auto] @3xl:items-center"
      aria-labelledby={titleId}
    >
      <div className="min-w-0 @3xs:col-span-2 @lg:col-span-1 @lg:row-span-2 @3xl:row-span-1">
        <h3 id={titleId} className="text-sm leading-5 font-semibold [overflow-wrap:anywhere] whitespace-pre-wrap">
          {task.description}
        </h3>
        <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Assignees" role="list">
          {task.assignees.map((assignee) => (
            <li key={assignee} className="min-w-0 max-w-full">
              <Badge variant="secondary" className="max-w-full rounded-md text-muted-foreground [overflow-wrap:anywhere] whitespace-normal">
                {assignee}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @lg:justify-end">
        <TaskStatusSymbol status={task.status} />
        <dl>
          <dt className="sr-only">Promised due date</dt>
          <dd className="text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums">
            <time dateTime={task.dueDate}>{dateFormat.format(new Date(task.dueDate))}</time>
          </dd>
        </dl>
      </div>
      <div className="-mx-2 flex flex-wrap items-center gap-1 @3xs:mx-0 @3xs:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2 @lg:h-8"
          aria-label={`Edit task: ${task.description}`}
          onClick={(event) => open({ kind: 'edit', task }, event.currentTarget)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive @lg:h-8"
          aria-label={`Delete task: ${task.description}`}
          onClick={(event) => open({ kind: 'delete', task }, event.currentTarget)}
        >
          Delete
        </Button>
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
    const opener = trigger.current;
    setAction(null);
    setAnnouncement(message);
    requestAnimationFrame(() => {
      (opener?.isConnected ? opener : addButton.current)?.focus();
    });
  }

  return (
    <section className="@container min-w-0 p-4 font-sans text-foreground" aria-labelledby={headingId}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl leading-tight font-semibold tracking-tight">Task board</h2>
        <Button
          ref={addButton}
          type="button"
          onClick={(event) => openDialog({ kind: 'add' }, event.currentTarget)}
        >
          Add task
        </Button>
      </header>

      <div
        className="mt-4 grid grid-cols-1 items-end gap-x-3 gap-y-2 @3xs:grid-cols-2 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        role="group"
        aria-label="Task filters"
      >
        <div className="grid min-w-0 gap-1.5 [&>[data-slot=native-select-wrapper]]:w-full">
          <Label htmlFor={statusId} className="text-xs text-muted-foreground">Status</Label>
          <NativeSelect
            id={statusId}
            className="h-9 w-full min-w-0 bg-card"
            value={filters.status}
            onChange={(event) => onFiltersChange({ ...filters, status: event.currentTarget.value as TaskStatus | '' })}
          >
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {taskStatuses.map((status) => <NativeSelectOption key={status}>{status}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="grid min-w-0 gap-1.5 [&>[data-slot=native-select-wrapper]]:w-full">
          <Label htmlFor={assigneeId} className="text-xs text-muted-foreground">Assignee</Label>
          <NativeSelect
            id={assigneeId}
            className="h-9 w-full min-w-0 bg-card"
            value={filters.assignee}
            onChange={(event) => onFiltersChange({ ...filters, assignee: event.currentTarget.value })}
          >
            <NativeSelectOption value="">All assignees</NativeSelectOption>
            {assignees.map((assignee) => <NativeSelectOption key={assignee}>{assignee}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="col-span-full justify-self-start px-0 text-muted-foreground aria-disabled:cursor-default aria-disabled:opacity-60 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground @lg:col-span-1 @lg:px-3"
          aria-disabled={!hasFilters}
          onClick={() => {
            if (hasFilters) onFiltersChange({ ...emptyFilters });
          }}
        >
          Clear filters
        </Button>
      </div>

      <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground tabular-nums" role="status">
        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
      </p>
      <div className="sr-only" role="status">{announcement}</div>

      <Card className="gap-0 rounded-none border-0 border-t border-border p-0 shadow-none">
        {tasks.length > 0 ? (
          <ul className="divide-y divide-border" role="list">
            {tasks.map((task) => (
              <li key={task.id}><TaskRow task={task} open={openDialog} /></li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center">
            <h3 className="text-sm font-semibold">{hasFilters ? 'No matching tasks' : 'No tasks yet'}</h3>
            {hasFilters && <p className="mt-1 text-sm text-muted-foreground">Choose a different status or assignee, or clear the filters.</p>}
          </div>
        )}
      </Card>

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
