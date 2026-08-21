import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TerminalDrawer from '@/components/AIWebsiteBuilder/TerminalDrawer';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/TerminalDrawer',
  component: TerminalDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    output: [
      '$ npm install',
      'added 125 packages in 3.2s',
      '$ npm run dev',
      'Server running at http://localhost:3000',
    ],
  },
} satisfies Meta<typeof TerminalDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <div className="dark" style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};
