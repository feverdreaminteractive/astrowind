import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress';

const meta = {
  title: 'Shadcn/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
  },
  render: (args) => <Progress {...args} className="w-64" />,
};

export const WithLabel: Story = {
  args: {
    value: 80,
  },
  render: (args) => (
    <Progress {...args} className="w-64">
      <ProgressLabel>Uploading</ProgressLabel>
      <ProgressValue />
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-4">
      <Progress value={60}>
        <ProgressTrack>
          <ProgressIndicator className="bg-success" />
        </ProgressTrack>
      </Progress>
      <Progress value={45}>
        <ProgressTrack>
          <ProgressIndicator className="bg-warning" />
        </ProgressTrack>
      </Progress>
      <Progress value={30}>
        <ProgressTrack>
          <ProgressIndicator className="bg-info" />
        </ProgressTrack>
      </Progress>
      <Progress value={15}>
        <ProgressTrack>
          <ProgressIndicator className="bg-destructive" />
        </ProgressTrack>
      </Progress>
    </div>
  ),
};
