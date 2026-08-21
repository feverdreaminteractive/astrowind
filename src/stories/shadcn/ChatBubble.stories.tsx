import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleContent,
  ChatBubbleHeader,
} from '@/components/ui/chat-bubble';

const meta = {
  title: 'Shadcn/ChatBubble',
  component: ChatBubble,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Conversation: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <ChatBubble variant="received">
        <ChatBubbleAvatar fallback="JD" />
        <div>
          <ChatBubbleHeader>
            <span className="font-medium text-foreground">Jane Doe</span>
            <span>11:42 AM</span>
          </ChatBubbleHeader>
          <ChatBubbleContent variant="received">
            Hey, did you get a chance to review the PR?
          </ChatBubbleContent>
        </div>
      </ChatBubble>
      <ChatBubble variant="sent">
        <ChatBubbleAvatar fallback="Me" />
        <div>
          <ChatBubbleHeader className="flex-row-reverse">
            <span>11:44 AM</span>
          </ChatBubbleHeader>
          <ChatBubbleContent variant="sent">
            Yep, just left a couple comments!
          </ChatBubbleContent>
        </div>
      </ChatBubble>
    </div>
  ),
};
