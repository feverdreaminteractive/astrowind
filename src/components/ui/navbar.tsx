import * as React from "react"

import { cn } from "@/lib/utils"

function Navbar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="navbar"
      className={cn(
        "flex w-full items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/60",
        className
      )}
      {...props}
    />
  )
}

function NavbarBrand({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navbar-brand"
      className={cn(
        "flex items-center gap-2 text-sm font-semibold text-foreground",
        className
      )}
      {...props}
    />
  )
}

function NavbarContent({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="navbar-content"
      className={cn(
        "hidden flex-1 items-center gap-6 text-sm text-muted-foreground md:flex",
        className
      )}
      {...props}
    />
  )
}

function NavbarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navbar-actions"
      className={cn("ml-auto flex items-center gap-2", className)}
      {...props}
    />
  )
}

export { Navbar, NavbarBrand, NavbarContent, NavbarActions }
