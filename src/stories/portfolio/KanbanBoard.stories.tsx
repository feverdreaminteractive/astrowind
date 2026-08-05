import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import KanbanBoard from '@/components/KanbanBoard'
import { withPortfolioTheme } from '../decorators/ThemeDecorator'

const meta = {
  title: 'Portfolio/KanbanBoard',
  component: KanbanBoard,
  decorators: [withPortfolioTheme],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof KanbanBoard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithSampleData: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="min-h-screen p-4">
        <Story />
      </div>
    ),
  ],
}