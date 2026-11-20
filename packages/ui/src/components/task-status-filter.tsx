import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ListFilter } from 'lucide-react';
import { taskStatuses, type TaskFilters } from '@valor/contracts';
import { TaskStatusIcon } from './task-status-symbol';

const options = ['All statuses', ...taskStatuses] as const;

export function TaskStatusFilter({ id, status, onChange }: {
  id: string;
  status: TaskFilters['status'];
  onChange: (status: TaskFilters['status']) => void;
}) {
  return (
    <Select.Root value={status || 'All statuses'} onValueChange={value => {
      onChange(taskStatuses.find(option => option === value) ?? '');
    }}>
      <Select.Trigger
        id={id}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Select.Value />
        <Select.Icon asChild><ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" align="start" sideOffset={4} collisionPadding={8}
          className="z-50 max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <Select.Viewport>
            {options.map(option => (
              <Select.Item key={option} value={option} textValue={option}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent">
                <Select.ItemText>
                  <span className="flex items-center gap-2">
                    {option === 'All statuses'
                      ? <ListFilter aria-hidden="true" className="size-4 text-muted-foreground" />
                      : <TaskStatusIcon status={option} />}
                    {option}
                  </span>
                </Select.ItemText>
                <Select.ItemIndicator><Check aria-hidden="true" className="size-4" /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
