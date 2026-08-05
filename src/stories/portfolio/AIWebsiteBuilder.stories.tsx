import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import AIWebsiteBuilder from '@/components/AIWebsiteBuilder'

const meta = {
  title: 'Portfolio/AIWebsiteBuilder',
  component: AIWebsiteBuilder,
  parameters: {
    layout: 'fullscreen',
    // Note: This component uses iframes which may have cross-origin restrictions in Storybook
    docs: {
      description: {
        component: 'AI Website Builder with code editor and live preview. Note: Preview functionality may be limited in Storybook due to iframe sandboxing.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AIWebsiteBuilder>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
}