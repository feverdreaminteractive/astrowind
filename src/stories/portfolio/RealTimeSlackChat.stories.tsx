import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import RealTimeSlackChat from '@/components/RealTimeSlackChat'

const meta = {
  title: 'Portfolio/RealTimeSlackChat',
  component: RealTimeSlackChat,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RealTimeSlackChat>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const InContainer: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Story />
      </div>
    ),
  ],
}