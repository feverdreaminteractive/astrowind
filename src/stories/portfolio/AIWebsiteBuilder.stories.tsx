import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import AIWebsiteBuilder from '@/components/AIWebsiteBuilder/index'

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
    // 100vh/100vw made the Docs page (which stacks the description, controls
    // table, etc. above the preview) taller than one viewport, so the whole
    // window had to scroll — and the nested AIAssistant's mount-time
    // scrollIntoView() then scrolled that all the way to the bottom. A fixed
    // size keeps this contained; 100% width still fills the docs column
    // without overflowing it the way 100vw does.
    (Story) => (
      <div style={{ height: '700px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
}