import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import FileExplorer from '@/components/AIWebsiteBuilder/FileExplorer';
import { withPortfolioTheme } from '../../decorators/ThemeDecorator';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/FileExplorer',
  component: FileExplorer,
  decorators: [withPortfolioTheme],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'File explorer component for navigating project files in the AI Website Builder.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FileExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockFiles = [
  { name: 'src', type: 'folder', children: [
    { name: 'index.tsx', type: 'file' },
    { name: 'App.tsx', type: 'file' },
    { name: 'styles.css', type: 'file' },
  ]},
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
];

export const Default: Story = {
  args: {
    files: mockFiles,
  },
};

export const WithSelectedFile: Story = {
  args: {
    files: mockFiles,
    selectedFile: 'src/App.tsx',
  },
};

export const Empty: Story = {
  args: {
    files: [],
  },
};

export const LargeProject: Story = {
  args: {
    files: [
      { name: 'src', type: 'folder', children: [
        { name: 'components', type: 'folder', children: [
          { name: 'Header.tsx', type: 'file' },
          { name: 'Footer.tsx', type: 'file' },
          { name: 'Layout.tsx', type: 'file' },
        ]},
        { name: 'pages', type: 'folder', children: [
          { name: 'Home.tsx', type: 'file' },
          { name: 'About.tsx', type: 'file' },
        ]},
        { name: 'utils', type: 'folder', children: [
          { name: 'api.ts', type: 'file' },
          { name: 'helpers.ts', type: 'file' },
        ]},
      ]},
      { name: 'public', type: 'folder' },
      { name: 'package.json', type: 'file' },
    ],
  },
};