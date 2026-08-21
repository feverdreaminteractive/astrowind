import * as React from "react"

import { cn } from "@/lib/utils"

function Gallery({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="gallery"
      className={cn("columns-2 gap-4 sm:columns-3", className)}
      {...props}
    />
  )
}

function GalleryItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="gallery-item"
      className={cn(
        "mb-4 overflow-hidden rounded-lg border border-border break-inside-avoid [&_img]:block [&_img]:w-full",
        className
      )}
      {...props}
    />
  )
}

export { Gallery, GalleryItem }
