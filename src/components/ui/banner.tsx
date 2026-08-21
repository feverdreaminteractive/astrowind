import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Banner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner"
      className={cn(
        "flex w-full flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 text-sm text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

function BannerIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-icon"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function BannerContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-content"
      className={cn("flex flex-1 flex-wrap items-center gap-1", className)}
      {...props}
    />
  )
}

function BannerActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-actions"
      className={cn("ml-auto flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  )
}

function BannerClose({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="banner-close"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      className={cn(className)}
      {...props}
    >
      <XIcon />
      <span className="sr-only">Dismiss</span>
    </Button>
  )
}

export { Banner, BannerIcon, BannerContent, BannerActions, BannerClose }
