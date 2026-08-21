"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function SpeedDial({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const [open, setOpen] = React.useState(false)

  return (
    <div
      data-slot="speed-dial"
      data-state={open ? "open" : "closed"}
      className={cn("relative flex flex-col items-center gap-2", className)}
      {...props}
    >
      {open ? (
        <div
          data-slot="speed-dial-actions"
          className="flex flex-col items-center gap-2"
        >
          {children}
        </div>
      ) : null}
      <Button
        type="button"
        size="icon"
        className="rounded-full"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <PlusIcon
          className={cn("transition-transform", open && "rotate-45")}
        />
      </Button>
    </div>
  )
}

function SpeedDialAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      data-slot="speed-dial-action"
      className={cn("rounded-full", className)}
      {...props}
    />
  )
}

export { SpeedDial, SpeedDialAction }
