import * as React from "react"

import { cn } from "@/lib/utils"

function TimePicker({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="time"
      data-slot="time-picker"
      className={cn(
        "h-8 w-fit min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert",
        className
      )}
      {...props}
    />
  )
}

export { TimePicker }
