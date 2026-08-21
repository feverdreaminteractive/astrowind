import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Rating } from '@/components/ui/rating';

const meta = {
  title: 'Shadcn/Rating',
  component: Rating,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
    },
  },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 4,
  },
};

export const WithLabel: Story = {
  args: {
    value: 5,
    label: '5.0',
  },
};

export const WithBadge: Story = {
  args: {
    value: 5,
    badge: '4.8 out of 5',
  },
};
