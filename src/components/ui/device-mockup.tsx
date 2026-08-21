import * as React from "react"

import { cn } from "@/lib/utils"

function PhoneMockup({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-mockup"
      className={cn(
        "relative w-64 rounded-[2.5rem] border-8 border-foreground/90 bg-foreground/90 p-2",
        className
      )}
      {...props}
    >
      <div className="absolute top-2 left-1/2 z-10 h-4 w-24 -translate-x-1/2 rounded-full bg-foreground/90" />
      <div className="aspect-[9/19] overflow-hidden rounded-[2rem] bg-background">
        {children}
      </div>
    </div>
  )
}

function BrowserMockup({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="browser-mockup"
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-warning/40" />
        <span className="size-2.5 rounded-full bg-success/40" />
      </div>
      <div className="bg-background">{children}</div>
    </div>
  )
}

export { PhoneMockup, BrowserMockup }
