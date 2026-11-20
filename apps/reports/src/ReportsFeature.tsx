import {
  taskStatuses,
  type RenovationTask,
  type ReportsFeatureProps,
} from '@valor/contracts';
import { useId } from 'react';
import { localDateKey, summarizeCommitments } from './summarizeCommitments';
import './reports.css';

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
    <div className="valor-reports__deadlines" data-overdue={label === 'Overdue' || undefined}>
      <h4 id={headingId}>{label}</h4>
      <ul aria-labelledby={headingId} role="list">
        {tasks.map(({ id, description, dueDate, assignees }) => (
          <li key={id}>
            <span className="valor-reports__description">{description}</span>
            <span className="valor-reports__due">
              <time dateTime={dueDate}>{formatDate.format(new Date(`${dueDate}T00:00:00Z`))}</time>
              {dueDate === today && <span className="valor-reports__due-today">Due today</span>}
            </span>
            <span>{formatAssignees.format(assignees)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportsFeature({ tasks }: ReportsFeatureProps) {
  const headingId = useId();
  const progressId = useId();
  const today = localDateKey(new Date());
  const { total, counts, overdue, upcoming } = summarizeCommitments(tasks, today);
  const done = counts.Done;
  const progressMaximum = Math.max(total, 1);

  return (
    <section className="valor-reports" aria-labelledby={headingId}>
      <h2 className="valor-reports__heading" id={headingId}>Commitment progress</h2>

      <div className="valor-reports__completion">
        <div className="valor-reports__completion-label">
          <label htmlFor={progressId}>Tasks completed</label>
          <span aria-hidden="true">{formatPercent.format(done / progressMaximum)}</span>
        </div>
        <progress id={progressId} value={done} max={progressMaximum} />
        <p>{formatCount.format(done)} of {formatCount.format(total)} {total === 1 ? 'task' : 'tasks'} done</p>
      </div>

      <dl className="valor-reports__counts" aria-label="Task counts by status">
        {taskStatuses.map(status => (
          <div key={status}>
            <dt>{status}</dt>
            <dd>{formatCount.format(counts[status])}</dd>
          </div>
        ))}
      </dl>

      {total === 0 ? (
        <p className="valor-reports__empty">No commitments to show.</p>
      ) : (
        <div className="valor-reports__schedule">
          <h3>Promised due dates</h3>
          {overdue.length === 0 && upcoming.length === 0 ? (
            <p className="valor-reports__empty">No outstanding deadlines.</p>
          ) : (
            <>
              <DeadlineList label="Overdue" tasks={overdue} today={today} />
              <DeadlineList label="Upcoming" tasks={upcoming} today={today} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
