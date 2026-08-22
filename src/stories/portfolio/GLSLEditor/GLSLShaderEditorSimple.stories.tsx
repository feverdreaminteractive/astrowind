import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import GLSLShaderEditorSimple from '@/components/GLSLEditor/GLSLShaderEditorSimple';

const meta = {
  title: 'Portfolio/GLSLEditor/GLSLShaderEditorSimple',
  component: GLSLShaderEditorSimple,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof GLSLShaderEditorSimple>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <div className="dark" style={{ backgroundColor: '#0a0a0a', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};
