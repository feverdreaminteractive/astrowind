import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import {
  Jumbotron,
  JumbotronHeading,
  JumbotronDescription,
  JumbotronActions,
} from '@/components/ui/jumbotron';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Shadcn/Jumbotron',
  component: Jumbotron,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    align: {
      control: { type: 'select' },
      options: ['center', 'left'],
    },
  },
} satisfies Meta<typeof Jumbotron>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Centered: Story = {
  render: (args) => (
    <Jumbotron {...args}>
      <JumbotronHeading>Build faster, ship sooner</JumbotronHeading>
      <JumbotronDescription>
        A component library that gets out of your way, so you can focus on
        what makes your product different.
      </JumbotronDescription>
      <JumbotronActions>
        <Button size="lg">Get started</Button>
        <Button size="lg" variant="outline">Learn more</Button>
      </JumbotronActions>
    </Jumbotron>
  ),
};

export const LeftAligned: Story = {
  render: () => (
    <Jumbotron align="left">
      <JumbotronHeading>Build faster, ship sooner</JumbotronHeading>
      <JumbotronDescription>
        A component library that gets out of your way, so you can focus on
        what makes your product different.
      </JumbotronDescription>
      <JumbotronActions>
        <Button size="lg">Get started</Button>
      </JumbotronActions>
    </Jumbotron>
  ),
};
