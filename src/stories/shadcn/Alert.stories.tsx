import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Shadcn/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'success', 'warning', 'info'],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the CLI.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: (args) => (
    <Alert {...args} variant="destructive" className="w-96">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: (args) => (
    <Alert {...args} variant="success" className="w-96">
      <AlertTitle>Changes saved</AlertTitle>
      <AlertDescription>
        Your project settings were updated successfully.
      </AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  render: (args) => (
    <Alert {...args} variant="warning" className="w-96">
      <AlertTitle>Storage almost full</AlertTitle>
      <AlertDescription>
        You've used 90% of your available storage.
      </AlertDescription>
    </Alert>
  ),
};

export const Info: Story = {
  render: (args) => (
    <Alert {...args} variant="info" className="w-96">
      <AlertTitle>Scheduled maintenance</AlertTitle>
      <AlertDescription>
        The site will be briefly unavailable tonight at 11pm.
      </AlertDescription>
    </Alert>
  ),
};

export const WithAction: Story = {
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription>A new version is ready to install.</AlertDescription>
      <AlertAction>
        <Button size="sm">Update</Button>
      </AlertAction>
    </Alert>
  ),
};
