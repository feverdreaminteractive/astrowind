import * as React from "react"
import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

function Rating({
  className,
  value,
  max = 5,
  label,
  badge,
  ...props
}: React.ComponentProps<"div"> & {
  value: number
  max?: number
  label?: React.ReactNode
  badge?: React.ReactNode
}) {
  const filled = Math.round(value)
  return (
    <div
      data-slot="rating"
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <div data-slot="rating-stars" className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <StarIcon
            key={i}
            className={cn(
              "size-4",
              i < filled
                ? "fill-warning text-warning"
                : "fill-transparent text-muted-foreground"
            )}
          />
        ))}
      </div>
      {label !== undefined ? (
        <span
          data-slot="rating-label"
          className="text-sm text-muted-foreground"
        >
          {label}
        </span>
      ) : null}
      {badge ? (
        typeof badge === "string" ? (
          <Badge variant="outline">{badge}</Badge>
        ) : (
          badge
        )
      ) : null}
    </div>
  )
}

export { Rating }
