import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import GLSLShaderEditor from '@/components/GLSLEditor/GLSLShaderEditor';
import { withPortfolioTheme } from '../../decorators/ThemeDecorator';

const meta = {
  title: 'Portfolio/GLSLEditor/GLSLShaderEditor',
  component: GLSLShaderEditor,
  decorators: [withPortfolioTheme],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Advanced GLSL shader editor with live preview and syntax highlighting.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof GLSLShaderEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomEndpoint: Story = {
  args: {
    aiTeamEndpoint: '/.netlify/functions/ai-shader',
  },
};