import { taskStatuses, type ReportsFeatureProps } from '@valor/contracts';
import { Card, CardContent, Progress, TaskStatusSymbol } from '@valor/ui';
import '@valor/ui/styles.css';
import { useId } from 'react';
import { summarizeCommitments } from './summarizeCommitments';

const formatCount = new Intl.NumberFormat('en');
const formatPercent = new Intl.NumberFormat('en', { style: 'percent' });

export default function ReportsFeature({ tasks }: ReportsFeatureProps) {
  const headingId = useId();
  const progressLabelId = useId();
  const { total, counts } = summarizeCommitments(tasks);
  const done = counts.Done;
  const progressMaximum = Math.max(total, 1);

  return (
    <section className="min-w-0" aria-labelledby={headingId}>
      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none">
        <CardContent className="grid items-center gap-x-8 gap-y-3 p-4 md:grid-cols-[minmax(12rem,1fr)_minmax(0,1.4fr)_minmax(10rem,1fr)]">
          <div className="grid gap-1">
            <h2 id={headingId} className="m-0 text-base font-semibold tracking-tight">Task summary</h2>
            <p className="text-sm text-muted-foreground">
              <strong className="text-lg font-semibold text-foreground tabular-nums">{formatCount.format(total)}</strong>
              {' '}{total === 1 ? 'task' : 'tasks'} displayed
            </p>
          </div>

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
        </CardContent>
      </Card>
    </section>
  );
}
