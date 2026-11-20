import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Circle, CircleCheck, Contrast } from 'lucide-react';
import type { TaskStatus } from '@valor/contracts';

const symbols = {
  Open: { Icon: Circle, color: 'text-slate-500' },
  'In progress': { Icon: Contrast, color: 'text-amber-700' },
  Done: { Icon: CircleCheck, color: 'text-emerald-700' },
} satisfies Record<TaskStatus, { Icon: typeof Circle; color: string }>;

export function TaskStatusSymbol({ status }: { status: TaskStatus }) {
  const { Icon, color } = symbols[status];
  const [open, setOpen] = useState(false);

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger
          type="button"
          aria-label={`Status: ${status}`}
          className={`inline-flex size-7 shrink-0 cursor-help items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${color}`}
          onClick={event => {
            // Tapping the symbol should also reveal its name.
            event.preventDefault();
            setOpen(true);
          }}
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={4} className="z-50 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-sm">
            {status}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
