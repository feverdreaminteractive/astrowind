import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type StepState = "complete" | "current" | "upcoming"

function Stepper({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"ol"> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <ol
      data-slot="stepper"
      data-orientation={orientation}
      className={cn(
        "group/stepper flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:items-start data-[orientation=vertical]:flex-col data-[orientation=vertical]:gap-6",
        className
      )}
      {...props}
    />
  )
}

function StepperItem({
  className,
  state = "upcoming",
  ...props
}: React.ComponentProps<"li"> & {
  state?: StepState
}) {
  return (
    <li
      data-slot="stepper-item"
      data-state={state}
      className={cn(
        "group/stepper-item relative flex flex-1 flex-col items-center gap-2 text-center not-last:after:absolute not-last:after:top-4 not-last:after:left-1/2 not-last:after:h-px not-last:after:w-full not-last:after:bg-border not-last:data-[state=complete]:after:bg-primary group-data-[orientation=vertical]/stepper:flex-row group-data-[orientation=vertical]/stepper:items-start group-data-[orientation=vertical]/stepper:text-left not-last:group-data-[orientation=vertical]/stepper:after:top-8 not-last:group-data-[orientation=vertical]/stepper:after:left-4 not-last:group-data-[orientation=vertical]/stepper:after:h-full not-last:group-data-[orientation=vertical]/stepper:after:w-px",
        className
      )}
      {...props}
    />
  )
}

function StepperIndicator({
  className,
  state = "upcoming",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  state?: StepState
}) {
  return (
    <div
      data-slot="stepper-indicator"
      data-state={state}
      className={cn(
        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
        "border-border bg-background text-muted-foreground",
        "data-[state=current]:border-primary data-[state=current]:text-primary",
        "data-[state=complete]:border-primary data-[state=complete]:bg-primary data-[state=complete]:text-primary-foreground",
        className
      )}
      {...props}
    >
      {state === "complete" ? <CheckIcon className="size-4" /> : children}
    </div>
  )
}

function StepperLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stepper-label"
      className={cn("text-sm text-muted-foreground group-data-[state=current]/stepper-item:text-foreground group-data-[state=complete]/stepper-item:text-foreground", className)}
      {...props}
    />
  )
}

export { Stepper, StepperItem, StepperIndicator, StepperLabel }
