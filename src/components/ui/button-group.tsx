import * as React from "react"

import { cn } from "@/lib/utils"

function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <div
      data-slot="button-group"
      data-orientation={orientation}
      role="group"
      className={cn(
        "inline-flex items-center gap-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup }
