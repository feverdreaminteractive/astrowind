import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const jumbotronVariants = cva("flex flex-col gap-6 px-6 py-24", {
  variants: {
    align: {
      center: "items-center text-center",
      left: "items-start text-left",
    },
  },
  defaultVariants: {
    align: "center",
  },
})

function Jumbotron({
  className,
  align,
  ...props
}: React.ComponentProps<"section"> & VariantProps<typeof jumbotronVariants>) {
  return (
    <section
      data-slot="jumbotron"
      className={cn(jumbotronVariants({ align }), className)}
      {...props}
    />
  )
}

function JumbotronHeading({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="jumbotron-heading"
      className={cn(
        "text-4xl font-bold tracking-tight text-foreground md:text-5xl",
        className
      )}
      {...props}
    />
  )
}

function JumbotronDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="jumbotron-description"
      className={cn(
        "max-w-2xl text-lg text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function JumbotronActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="jumbotron-actions"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  )
}

export { Jumbotron, JumbotronHeading, JumbotronDescription, JumbotronActions }
