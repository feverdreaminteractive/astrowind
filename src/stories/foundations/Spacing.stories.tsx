import React from "react";
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Spacing',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const steps = [
  '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8',
  '9', '10', '12', '14', '16', '20', '24', '28', '32',
];

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {steps.map((step) => (
        <div key={step} className="flex items-center gap-4">
          <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
            {step}
          </span>
          <div className={`h-4 bg-primary`} style={{ width: `calc(var(--spacing-${step}) )` }} />
        </div>
      ))}
    </div>
  ),
};
