import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { List, ListItem } from '@/components/ui/list';

const meta = {
  title: 'Shadcn/List',
  component: List,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disc: Story = {
  render: () => (
    <List variant="disc">
      <ListItem>At least 10 characters</ListItem>
      <ListItem>At least one lowercase character</ListItem>
      <ListItem>Inclusion of at least one special character</ListItem>
    </List>
  ),
};

export const Decimal: Story = {
  render: () => (
    <List ordered>
      <ListItem>Create an account</ListItem>
      <ListItem>Verify your email</ListItem>
      <ListItem>Set up your workspace</ListItem>
    </List>
  ),
};

export const Plain: Story = {
  render: () => (
    <List variant="none">
      <ListItem>Dashboard</ListItem>
      <ListItem>Settings</ListItem>
      <ListItem>Sign out</ListItem>
    </List>
  ),
};
