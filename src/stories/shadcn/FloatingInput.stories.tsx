import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { FloatingInput } from '@/components/ui/floating-input';

const meta = {
  title: 'Shadcn/FloatingInput',
  component: FloatingInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FloatingInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'fi-email',
    label: 'Email address',
    className: 'w-64',
  },
};

export const WithValue: Story = {
  args: {
    id: 'fi-name',
    label: 'Full name',
    defaultValue: 'Ada Lovelace',
    className: 'w-64',
  },
};

export const Disabled: Story = {
  args: {
    id: 'fi-disabled',
    label: 'Company',
    disabled: true,
    className: 'w-64',
  },
};
