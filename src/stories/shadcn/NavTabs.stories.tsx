import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const meta = {
  title: 'Shadcn/NavTabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Underline: Story = {
  render: () => (
    <Tabs defaultValue="profile" className="w-[420px]">
      <TabsList variant="line">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="text-sm text-muted-foreground">
        Profile content goes here.
      </TabsContent>
      <TabsContent value="dashboard" className="text-sm text-muted-foreground">
        Dashboard content goes here.
      </TabsContent>
      <TabsContent value="settings" className="text-sm text-muted-foreground">
        Settings content goes here.
      </TabsContent>
      <TabsContent value="contacts" className="text-sm text-muted-foreground">
        Contacts content goes here.
      </TabsContent>
    </Tabs>
  ),
};
