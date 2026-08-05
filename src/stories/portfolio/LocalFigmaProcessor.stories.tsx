import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import LocalFigmaProcessor from '@/components/LocalFigmaProcessor';

const meta = {
  title: 'Portfolio/LocalFigmaProcessor',
  component: LocalFigmaProcessor,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Processes Figma designs locally to extract components, styles, and assets. Converts Figma designs into code-ready components with preserved styling and layout.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LocalFigmaProcessor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default Figma processor ready to accept design files',
      },
    },
  },
};

export const WithApiKey: Story = {
  args: {
    apiKey: 'demo-api-key',
  },
  parameters: {
    docs: {
      description: {
        story: 'Processor configured with Figma API access',
      },
    },
  },
};

export const ProcessingMode: Story = {
  args: {
    isProcessing: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the processor in active processing state',
      },
    },
  },
};

export const WithResults: Story = {
  args: {
    mockResults: {
      components: 12,
      styles: 8,
      assets: 24,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Processor displaying extraction results',
      },
    },
  },
};