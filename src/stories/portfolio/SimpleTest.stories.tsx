import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

const SimpleComponent = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#333', color: '#fff' }}>
      <h1>Simple Test Component</h1>
      <p>This is a basic test to ensure Storybook is working.</p>
    </div>
  )
}

const meta = {
  title: 'Portfolio/SimpleTest',
  component: SimpleComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SimpleComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}