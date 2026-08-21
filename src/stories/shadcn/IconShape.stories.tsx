import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { IconShape } from '@/components/ui/icon-shape';
import { CheckIcon, ZapIcon, TriangleAlertIcon, InfoIcon } from 'lucide-react';

const meta = {
  title: 'Shadcn/IconShape',
  component: IconShape,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    shape: {
      control: { type: 'select' },
      options: ['square', 'circle'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'success', 'warning', 'info', 'destructive'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'default', 'lg'],
    },
  },
} satisfies Meta<typeof IconShape>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args) => (
    <IconShape {...args}>
      <ZapIcon />
    </IconShape>
  ),
};

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <IconShape shape="square" variant="primary">
        <ZapIcon />
      </IconShape>
      <IconShape shape="circle" variant="primary">
        <ZapIcon />
      </IconShape>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <IconShape variant="success">
        <CheckIcon />
      </IconShape>
      <IconShape variant="warning">
        <TriangleAlertIcon />
      </IconShape>
      <IconShape variant="info">
        <InfoIcon />
      </IconShape>
      <IconShape variant="destructive">
        <TriangleAlertIcon />
      </IconShape>
    </div>
  ),
};
