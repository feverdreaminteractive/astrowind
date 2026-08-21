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
  args: {
    onFileSelect: () => {},
    project: { name: 'demo-project', files: [] },
    setProject: () => {},
    selectedFile: null,
  },
} satisfies Meta<typeof FileExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockFiles = [
  { name: 'src', type: 'folder' as const, path: 'src', children: [
    { name: 'index.tsx', type: 'file' as const, path: 'src/index.tsx' },
    { name: 'App.tsx', type: 'file' as const, path: 'src/App.tsx' },
    { name: 'styles.css', type: 'file' as const, path: 'src/styles.css' },
  ]},
  { name: 'package.json', type: 'file' as const, path: 'package.json' },
  { name: 'README.md', type: 'file' as const, path: 'README.md' },
];

export const Default: Story = {
  args: {
    files: mockFiles,
  },
};

export const WithSelectedFile: Story = {
  args: {
    files: mockFiles,
    selectedFile: { name: 'App.tsx', type: 'file', path: 'src/App.tsx' },
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
      { name: 'src', type: 'folder' as const, path: 'src', children: [
        { name: 'components', type: 'folder' as const, path: 'src/components', children: [
          { name: 'Header.tsx', type: 'file' as const, path: 'src/components/Header.tsx' },
          { name: 'Footer.tsx', type: 'file' as const, path: 'src/components/Footer.tsx' },
          { name: 'Layout.tsx', type: 'file' as const, path: 'src/components/Layout.tsx' },
        ]},
        { name: 'pages', type: 'folder' as const, path: 'src/pages', children: [
          { name: 'Home.tsx', type: 'file' as const, path: 'src/pages/Home.tsx' },
          { name: 'About.tsx', type: 'file' as const, path: 'src/pages/About.tsx' },
        ]},
        { name: 'utils', type: 'folder' as const, path: 'src/utils', children: [
          { name: 'api.ts', type: 'file' as const, path: 'src/utils/api.ts' },
          { name: 'helpers.ts', type: 'file' as const, path: 'src/utils/helpers.ts' },
        ]},
      ]},
      { name: 'public', type: 'folder' as const, path: 'public' },
      { name: 'package.json', type: 'file' as const, path: 'package.json' },
    ],
  },
};