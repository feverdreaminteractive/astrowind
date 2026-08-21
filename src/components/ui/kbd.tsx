import * as React from "react"

import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-md border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground shadow-xs",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
