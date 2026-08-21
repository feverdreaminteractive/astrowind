import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { SpeedDial, SpeedDialAction } from '@/components/ui/speed-dial';
import { ShareIcon, PencilIcon, TrashIcon } from 'lucide-react';

const meta = {
  title: 'Shadcn/SpeedDial',
  component: SpeedDial,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpeedDial>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SpeedDial>
      <SpeedDialAction aria-label="Share">
        <ShareIcon />
      </SpeedDialAction>
      <SpeedDialAction aria-label="Edit">
        <PencilIcon />
      </SpeedDialAction>
      <SpeedDialAction aria-label="Delete">
        <TrashIcon />
      </SpeedDialAction>
    </SpeedDial>
  ),
};
