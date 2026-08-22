import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import AmbientBackground from '@/components/AmbientBackground'

const meta = {
  title: 'Portfolio/AmbientBackground',
  component: AmbientBackground,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AmbientBackground>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: '100%', height: '500px' }}>
        <Story />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>
          <h1>Content Over Background</h1>
        </div>
      </div>
    ),
  ],
}