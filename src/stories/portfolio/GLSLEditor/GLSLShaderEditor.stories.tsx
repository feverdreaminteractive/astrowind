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

const defaultVertexShader = `
attribute vec3 position;
uniform mat4 modelViewProjection;

void main() {
  gl_Position = modelViewProjection * vec4(position, 1.0);
}
`;

const defaultFragmentShader = `
precision mediump float;
uniform float time;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 color = 0.5 + 0.5 * cos(time + uv.xyx + vec3(0,2,4));
  gl_FragColor = vec4(color, 1.0);
}
`;

export const Default: Story = {
  args: {
    initialVertexShader: defaultVertexShader,
    initialFragmentShader: defaultFragmentShader,
  },
};

export const WithGradient: Story = {
  args: {
    initialFragmentShader: `
precision mediump float;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 color = vec3(uv.x, uv.y, 1.0 - uv.x);
  gl_FragColor = vec4(color, 1.0);
}
    `,
  },
};

export const WithAnimation: Story = {
  args: {
    initialFragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  float wave = sin(uv.x * 10.0 + time) * 0.5 + 0.5;
  vec3 color = vec3(wave, 0.3, 1.0 - wave);
  gl_FragColor = vec4(color, 1.0);
}
    `,
    animate: true,
  },
};

export const SplitView: Story = {
  args: {
    layout: 'split',
    initialVertexShader: defaultVertexShader,
    initialFragmentShader: defaultFragmentShader,
  },
};