import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Calendar } from '@/components/ui/calendar';

const meta = {
  title: 'Shadcn/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Calendar mode="single" defaultMonth={new Date()} className="rounded-lg border border-border" />
  ),
};
