import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Check } from 'lucide-react';
import { taskStatuses, type TaskStatus } from '@valor/contracts';
import { StatusTooltipContent, TaskStatusIcon } from './task-status-symbol';

export function TaskStatusMenu({ status, onChange, disabled }: {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root open={hovered && !open} onOpenChange={setHovered}>
          <Tooltip.Trigger asChild>
            <Menu.Trigger
              type="button"
              disabled={disabled}
              aria-label={`Status: ${status}`}
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <TaskStatusIcon status={status} />
            </Menu.Trigger>
          </Tooltip.Trigger>
          <StatusTooltipContent status={status} />
        </Tooltip.Root>
      </Tooltip.Provider>
      <Menu.Portal>
        <Menu.Content aria-labelledby={undefined} aria-label="Change task status" align="start" sideOffset={4} collisionPadding={8}
          className="z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <Menu.RadioGroup value={status}>
            {taskStatuses.map(option => (
              <Menu.RadioItem key={option} value={option} onSelect={() => { if (option !== status) onChange(option); }}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent">
                <TaskStatusIcon status={option} />
                {option}
                <Menu.ItemIndicator className="ml-auto"><Check aria-hidden="true" className="size-4" /></Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
