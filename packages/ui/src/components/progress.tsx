"use client"

import * as React from "react"
import { cn } from "#lib/utils"
import * as ProgressPrimitive from "@radix-ui/react-progress"

function Progress({
  className,
  indicatorClassName,
  value,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}) {
  const percentage = value != null && max > 0 && value >= 0 && value <= max
    ? (value / max) * 100
    : 0

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
