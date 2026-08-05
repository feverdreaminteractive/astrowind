import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import SmartRecruitingFlow from '@/components/SmartRecruitingFlow'

const meta = {
  title: 'Portfolio/SmartRecruitingFlow',
  component: SmartRecruitingFlow,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SmartRecruitingFlow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const InContainer: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background p-8">
        <Story />
      </div>
    ),
  ],
}