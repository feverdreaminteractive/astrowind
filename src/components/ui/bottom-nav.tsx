import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

function BottomNav({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-nav"
      role="navigation"
      className={cn(
        "flex items-center justify-around border-t border-border bg-background py-2",
        className
      )}
      {...props}
    />
  )
}

function BottomNavItem({
  className,
  active = false,
  render,
  ...props
}: useRender.ComponentProps<"button"> & {
  active?: boolean
}) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        "aria-current": active ? "page" : undefined,
        className: cn(
          "flex flex-1 flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors [&_svg]:size-5",
          active
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "bottom-nav-item",
      active,
    },
  })
}

export { BottomNav, BottomNavItem }
