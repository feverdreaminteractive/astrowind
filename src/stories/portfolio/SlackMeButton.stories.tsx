import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import SlackMeButton from '@/components/SlackMeButton'

const meta = {
  title: 'Portfolio/SlackMeButton',
  component: SlackMeButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SlackMeButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const CustomText: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="space-y-4">
        <p className="text-primary-300">Click below to chat with me on Slack!</p>
        <Story />
      </div>
    ),
  ],
}