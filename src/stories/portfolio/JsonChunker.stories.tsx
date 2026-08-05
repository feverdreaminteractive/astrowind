import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import JsonChunker from '@/components/JsonChunker';

const meta = {
  title: 'Portfolio/JsonChunker',
  component: JsonChunker,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A utility component for splitting large JSON files into smaller chunks. Useful for processing large datasets, API responses, or preparing data for batch operations.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof JsonChunker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default JSON chunker interface',
      },
    },
  },
};

export const WithSampleData: Story = {
  args: {
    initialData: JSON.stringify([
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item 2', value: 200 },
      { id: 3, name: 'Item 3', value: 300 },
      { id: 4, name: 'Item 4', value: 400 },
      { id: 5, name: 'Item 5', value: 500 },
    ], null, 2),
    chunkSize: 2,
  },
  parameters: {
    docs: {
      description: {
        story: 'JSON chunker with pre-loaded sample data',
      },
    },
  },
};

export const LargeDataset: Story = {
  args: {
    maxSize: 10000000, // 10MB
    chunkSize: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Configured for handling large JSON datasets up to 10MB',
      },
    },
  },
};

export const CompactView: Story = {
  args: {
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view with minimal UI elements',
      },
    },
  },
};