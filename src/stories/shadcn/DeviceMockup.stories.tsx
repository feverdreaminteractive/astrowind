import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { PhoneMockup, BrowserMockup } from '@/components/ui/device-mockup';

const meta = {
  title: 'Shadcn/DeviceMockup',
  component: PhoneMockup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PhoneMockup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  render: () => (
    <PhoneMockup>
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        App screen
      </div>
    </PhoneMockup>
  ),
};

export const Browser: Story = {
  render: () => (
    <BrowserMockup className="w-96">
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Page content
      </div>
    </BrowserMockup>
  ),
};
