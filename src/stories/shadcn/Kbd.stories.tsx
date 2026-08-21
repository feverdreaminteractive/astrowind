import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from '@/components/ui/kbd';

const meta = {
  title: 'Shadcn/Kbd',
  component: Kbd,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '⌘',
  },
};

export const Shortcut: Story = {
  render: () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <span>Save with</span>
      <Kbd>Ctrl</Kbd>
      <span>+</span>
      <Kbd>S</Kbd>
    </div>
  ),
};
