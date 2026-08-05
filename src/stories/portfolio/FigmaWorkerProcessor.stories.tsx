import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import FigmaWorkerProcessor from '@/components/FigmaWorkerProcessor';

const meta = {
  title: 'Portfolio/FigmaWorkerProcessor',
  component: FigmaWorkerProcessor,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Advanced Figma processor using Web Workers for performance. Handles large Figma files efficiently with background processing and progress tracking.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FigmaWorkerProcessor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default worker-based Figma processor',
      },
    },
  },
};

export const WithFileUrl: Story = {
  args: {
    fileUrl: 'https://www.figma.com/file/example',
  },
  parameters: {
    docs: {
      description: {
        story: 'Processor with pre-filled Figma file URL',
      },
    },
  },
};

export const ProcessingLargeFile: Story = {
  args: {
    isProcessing: true,
    progress: 45,
    totalItems: 1000,
    processedItems: 450,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows processing state for a large Figma file',
      },
    },
  },
};

export const CompletedProcessing: Story = {
  args: {
    isComplete: true,
    results: {
      components: 156,
      styles: 42,
      assets: 89,
      processingTime: '12.3s',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Processor showing completed extraction with results',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    hasError: true,
    errorMessage: 'Failed to connect to Figma API',
  },
  parameters: {
    docs: {
      description: {
        story: 'Processor displaying an error state',
      },
    },
  },
};