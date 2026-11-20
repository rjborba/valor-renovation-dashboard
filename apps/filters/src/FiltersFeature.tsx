import { useId } from 'react';
import { emptyFilters, type FiltersFeatureProps } from '@valor/contracts';
import { Button, Label, NativeSelect, NativeSelectOption, TaskStatusFilter } from '@valor/ui';
import '@valor/ui/styles.css';

export default function FiltersFeature({ assignees, filters, onFiltersChange }: FiltersFeatureProps) {
  const headingId = useId();
  const statusId = useId();
  const assigneeId = useId();
  const hasFilters = Boolean(filters.status || filters.assignee);

  return (
    <section aria-labelledby={headingId} className="grid gap-4 p-4">
      <h2 id={headingId} className="text-base font-semibold tracking-tight">Task filters</h2>
      <div className="grid gap-3">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={statusId} className="text-xs text-muted-foreground">Status</Label>
          <TaskStatusFilter
            id={statusId}
            status={filters.status}
            onChange={status => onFiltersChange({ ...filters, status })}
          />
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
          className="justify-self-start px-2 text-muted-foreground aria-disabled:cursor-default aria-disabled:opacity-60 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground"
          aria-disabled={!hasFilters}
          onClick={() => {
            if (hasFilters) onFiltersChange({ ...emptyFilters });
          }}
        >
          Clear filters
        </Button>
      </div>
    </section>
  );
}
