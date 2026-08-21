import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Stepper, StepperItem, StepperIndicator, StepperLabel } from '@/components/ui/stepper';

const meta = {
  title: 'Shadcn/Stepper',
  component: Stepper,
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
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <Stepper className="w-[480px]">
      <StepperItem state="complete">
        <StepperIndicator state="complete">1</StepperIndicator>
        <StepperLabel>Account</StepperLabel>
      </StepperItem>
      <StepperItem state="complete">
        <StepperIndicator state="complete">2</StepperIndicator>
        <StepperLabel>Profile</StepperLabel>
      </StepperItem>
      <StepperItem state="current">
        <StepperIndicator state="current">3</StepperIndicator>
        <StepperLabel>Billing</StepperLabel>
      </StepperItem>
      <StepperItem state="upcoming">
        <StepperIndicator state="upcoming">4</StepperIndicator>
        <StepperLabel>Confirm</StepperLabel>
      </StepperItem>
    </Stepper>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Stepper orientation="vertical" className="w-64">
      <StepperItem state="complete">
        <StepperIndicator state="complete">1</StepperIndicator>
        <StepperLabel>Order placed</StepperLabel>
      </StepperItem>
      <StepperItem state="current">
        <StepperIndicator state="current">2</StepperIndicator>
        <StepperLabel>Processing</StepperLabel>
      </StepperItem>
      <StepperItem state="upcoming">
        <StepperIndicator state="upcoming">3</StepperIndicator>
        <StepperLabel>Shipped</StepperLabel>
      </StepperItem>
    </Stepper>
  ),
};
