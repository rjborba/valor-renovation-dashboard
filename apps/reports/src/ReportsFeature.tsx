import {
  localDateKey,
  taskStatuses,
  type RenovationTask,
  type ReportsFeatureProps,
} from '@valor/contracts';
import { Badge, Card, CardContent, Progress, TaskStatusSymbol } from '@valor/ui';
import '@valor/ui/styles.css';
import { useId } from 'react';
import { summarizeCommitments } from './summarizeCommitments';

const formatCount = new Intl.NumberFormat('en');
const formatPercent = new Intl.NumberFormat('en', { style: 'percent' });
const formatDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const formatAssignees = new Intl.ListFormat('en');

function DeadlineList({
  label,
  tasks,
  today,
}: {
  label: 'Overdue' | 'Upcoming';
  tasks: readonly RenovationTask[];
  today: string;
}) {
  const headingId = useId();
  if (tasks.length === 0) return null;

  return (
    <div>
      <h4 id={headingId} className="m-0 text-xs leading-5 font-medium text-muted-foreground">
        {label === 'Overdue' ? (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
            {label}
          </Badge>
        ) : label}
      </h4>
      <ul aria-labelledby={headingId} role="list" className="m-0 list-none divide-y divide-border p-0">
        {tasks.map(({ id, description, dueDate, assignees }) => (
          <li key={id} className="grid gap-1 py-2.5 first:pt-2 last:pb-0 [overflow-wrap:anywhere]">
            <span className="text-sm leading-snug font-medium">{description}</span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <time dateTime={dueDate} className="whitespace-nowrap tabular-nums">
                  {formatDate.format(new Date(`${dueDate}T00:00:00Z`))}
                </time>
                {dueDate === today && <Badge variant="outline" className="px-1.5 py-0">Due today</Badge>}
              </span>
              <span className="min-w-0">{formatAssignees.format(assignees)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportsFeature({ tasks }: ReportsFeatureProps) {
  const headingId = useId();
  const progressLabelId = useId();
  const today = localDateKey(new Date());
  const { total, counts, overdue, upcoming } = summarizeCommitments(tasks, today);
  const done = counts.Done;
  const progressMaximum = Math.max(total, 1);

  return (
    <section className="min-w-0" aria-labelledby={headingId}>
      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none">
        <CardContent className="grid items-center gap-x-8 gap-y-3 p-4 md:grid-cols-[minmax(12rem,1fr)_minmax(0,1.4fr)_minmax(10rem,1fr)]">
          <h2 id={headingId} className="m-0 text-base font-semibold tracking-tight">Task summary</h2>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span id={progressLabelId} className="text-sm font-medium">Tasks completed</span>
              <span aria-hidden="true" className="text-sm font-semibold tabular-nums">
                {formatPercent.format(done / progressMaximum)}
              </span>
            </div>
            <Progress
              aria-labelledby={progressLabelId}
              value={done}
              max={progressMaximum}
              className="bg-muted forced-colors:border forced-colors:bg-[Canvas]"
              indicatorClassName="motion-reduce:transition-none forced-colors:bg-[Highlight] forced-colors:forced-color-adjust-none"
            />
            <p className="m-0 text-xs text-muted-foreground">
              {formatCount.format(done)} of {formatCount.format(total)} {total === 1 ? 'task' : 'tasks'} done
            </p>
          </div>

          <dl className="m-0 grid grid-cols-3 gap-2 border-t border-border pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-6" aria-label="Task counts by status">
            {taskStatuses.map(status => (
              <div key={status} className="flex min-w-0 flex-col justify-between gap-1">
                <dt><TaskStatusSymbol status={status} /></dt>
                <dd className="m-0 text-base leading-none font-semibold tabular-nums">{formatCount.format(counts[status])}</dd>
              </div>
            ))}
          </dl>

          {total === 0 ? (
            <p className="col-span-full m-0 border-t border-border pt-3 text-sm text-muted-foreground">No commitments to show.</p>
          ) : (
            <details className="col-span-full border-t border-border pt-2">
              <summary className="w-fit cursor-pointer rounded-sm text-xs font-medium text-muted-foreground focus-visible:outline-ring">
                Promised due dates ({overdue.length + upcoming.length})
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {overdue.length === 0 && upcoming.length === 0 ? (
                  <p className="m-0 text-sm text-muted-foreground">No outstanding deadlines.</p>
                ) : (
                  <>
                    <DeadlineList label="Overdue" tasks={overdue} today={today} />
                    <DeadlineList label="Upcoming" tasks={upcoming} today={today} />
                  </>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
