import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from '@/components/ui/slider';

const meta = {
  title: 'Shadcn/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Slider defaultValue={[50]} className="w-64" />,
};

export const Range: Story = {
  render: () => <Slider defaultValue={[25, 75]} className="w-64" />,
};

export const Disabled: Story = {
  render: () => <Slider defaultValue={[40]} disabled className="w-64" />,
};
