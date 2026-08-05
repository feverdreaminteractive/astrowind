import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const components = [
  'AIWebsiteBuilder/AIAssistantEnhanced',
  'AIWebsiteBuilder/AIBuilderPro',
  'AIWebsiteBuilder/AIBuilderSimple',
  'AIWebsiteBuilder/AIBuilderWithContainer',
  'AIWebsiteBuilder/DeploymentPanel',
  'AIWebsiteBuilder/SimpleAIAssistant',
  'AIWebsiteBuilder/TerminalDrawer',
  'AIWebsiteBuilder/WebContainerBuilder',
  'GLSLEditor/GLSLShaderEditorSimple',
];

const createStoryContent = (componentName, path) => {
  const name = componentName.split('/').pop();
  const importPath = path ? `@/components/${path}` : `@/components/${componentName}`;

  return `import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ${name} from '${importPath}';

const meta = {
  title: 'Portfolio/${path || componentName}',
  component: ${name},
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ${name}>;

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
`;
};

components.forEach(component => {
  const storyPath = join('src/stories/portfolio', `${component}.stories.tsx`);

  if (!existsSync(storyPath)) {
    const dir = dirname(storyPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(storyPath, createStoryContent(component.split('/').pop(), component));
    console.log(`Created: ${storyPath}`);
  }
});

console.log('All stories created!');