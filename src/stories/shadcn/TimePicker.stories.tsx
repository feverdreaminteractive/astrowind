import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { TimePicker } from '@/components/ui/time-picker';

const meta = {
  title: 'Shadcn/TimePicker',
  component: TimePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: '13:30',
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: '09:00',
    disabled: true,
  },
};
