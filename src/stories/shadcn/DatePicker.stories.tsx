import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker } from '@/components/ui/date-picker';

const meta = {
  title: 'Shadcn/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Select a due date',
  },
};
