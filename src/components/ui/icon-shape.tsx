import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const iconShapeVariants = cva(
  "inline-flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      shape: {
        square: "rounded-lg",
        circle: "rounded-full",
      },
      variant: {
        default: "bg-muted text-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        info: "bg-info/10 text-info",
        destructive: "bg-destructive/10 text-destructive",
      },
      size: {
        sm: "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        default: "size-10",
        lg: "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      shape: "square",
      variant: "default",
      size: "default",
    },
  }
)

function IconShape({
  className,
  shape,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof iconShapeVariants>) {
  return (
    <div
      data-slot="icon-shape"
      className={cn(iconShapeVariants({ shape, variant, size }), className)}
      {...props}
    />
  )
}

export { IconShape, iconShapeVariants }
