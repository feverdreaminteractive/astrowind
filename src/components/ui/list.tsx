import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const listVariants = cva("flex flex-col gap-2 text-sm text-foreground", {
  variants: {
    variant: {
      disc: "list-disc pl-5",
      decimal: "list-decimal pl-5",
      none: "list-none",
    },
  },
  defaultVariants: {
    variant: "disc",
  },
})

function List({
  className,
  variant,
  ordered = false,
  ...props
}: React.ComponentProps<"ul"> &
  VariantProps<typeof listVariants> & {
    ordered?: boolean
  }) {
  const Comp = (ordered ? "ol" : "ul") as "ul"
  return (
    <Comp
      data-slot="list"
      className={cn(
        listVariants({ variant: variant ?? (ordered ? "decimal" : "disc") }),
        className
      )}
      {...props}
    />
  )
}

function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="list-item"
      className={cn("leading-6", className)}
      {...props}
    />
  )
}

export { List, ListItem, listVariants }
