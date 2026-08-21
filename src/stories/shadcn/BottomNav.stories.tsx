import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { BottomNav, BottomNavItem } from '@/components/ui/bottom-nav';
import { HomeIcon, SearchIcon, BellIcon, UserIcon } from 'lucide-react';

const meta = {
  title: 'Shadcn/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="mx-auto w-96">
      <BottomNav>
        <BottomNavItem active>
          <HomeIcon />
          Home
        </BottomNavItem>
        <BottomNavItem>
          <SearchIcon />
          Search
        </BottomNavItem>
        <BottomNavItem>
          <BellIcon />
          Alerts
        </BottomNavItem>
        <BottomNavItem>
          <UserIcon />
          Profile
        </BottomNavItem>
      </BottomNav>
    </div>
  ),
};
