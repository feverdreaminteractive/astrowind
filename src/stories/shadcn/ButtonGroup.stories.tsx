import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Shadcn/ButtonGroup',
  component: ButtonGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Center</Button>
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <ButtonGroup {...args} orientation="vertical">
      <Button variant="outline">Top</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Bottom</Button>
    </ButtonGroup>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <ButtonGroup>
        <Button variant="outline" size="xs">One</Button>
        <Button variant="outline" size="xs">Two</Button>
        <Button variant="outline" size="xs">Three</Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" size="sm">One</Button>
        <Button variant="outline" size="sm">Two</Button>
        <Button variant="outline" size="sm">Three</Button>
      </ButtonGroup>
    </div>
  ),
};
