import * as React from "react"

import { cn } from "@/lib/utils"

function FloatingInput({
  className,
  id,
  label,
  ...props
}: React.ComponentProps<"input"> & {
  id: string
  label: React.ReactNode
}) {
  return (
    <div data-slot="floating-input" className="relative">
      <input
        id={id}
        data-slot="floating-input-control"
        placeholder=" "
        className={cn(
          "peer h-10 w-full rounded-lg border border-input bg-transparent px-2.5 pt-3 pb-1 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      />
      <label
        htmlFor={id}
        data-slot="floating-input-label"
        className="pointer-events-none absolute top-2.5 left-2.5 origin-[0] -translate-y-4 scale-75 bg-background px-1 text-sm text-muted-foreground transition-all duration-100 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-primary"
      >
        {label}
      </label>
    </div>
  )
}

export { FloatingInput }
