import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const chatBubbleVariants = cva("flex max-w-sm items-end gap-2", {
  variants: {
    variant: {
      sent: "flex-row-reverse self-end",
      received: "flex-row self-start",
    },
  },
  defaultVariants: {
    variant: "received",
  },
})

const chatBubbleContentVariants = cva(
  "flex flex-col gap-1 rounded-xl px-3 py-2 text-sm",
  {
    variants: {
      variant: {
        sent: "rounded-br-none bg-primary text-primary-foreground",
        received: "rounded-bl-none bg-muted text-foreground",
      },
    },
    defaultVariants: {
      variant: "received",
    },
  }
)

function ChatBubble({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof chatBubbleVariants>) {
  return (
    <div
      data-slot="chat-bubble"
      className={cn(chatBubbleVariants({ variant }), className)}
      {...props}
    />
  )
}

function ChatBubbleAvatar({
  src,
  fallback,
  className,
}: {
  src?: string
  fallback: React.ReactNode
  className?: string
}) {
  return (
    <Avatar data-slot="chat-bubble-avatar" className={cn("shrink-0", className)}>
      {src ? <AvatarImage src={src} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )
}

function ChatBubbleContent({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof chatBubbleContentVariants>) {
  return (
    <div
      data-slot="chat-bubble-content"
      className={cn(chatBubbleContentVariants({ variant }), className)}
      {...props}
    />
  )
}

function ChatBubbleHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-bubble-header"
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleContent,
  ChatBubbleHeader,
}
