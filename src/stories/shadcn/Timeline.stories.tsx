import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import {
  Timeline,
  TimelineItem,
  TimelineDot,
  TimelineContent,
  TimelineTitle,
  TimelineTime,
  TimelineDescription,
} from '@/components/ui/timeline';

const meta = {
  title: 'Shadcn/Timeline',
  component: Timeline,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Timeline className="w-96">
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <TimelineTitle>Application submitted</TimelineTitle>
          <TimelineTime>Jan 13, 2024</TimelineTime>
          <TimelineDescription>
            Your application was received and is in the queue for review.
          </TimelineDescription>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot className="bg-success" />
        <TimelineContent>
          <TimelineTitle>Application approved</TimelineTitle>
          <TimelineTime>Jan 15, 2024</TimelineTime>
          <TimelineDescription>
            Great news — your application has been approved.
          </TimelineDescription>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot className="bg-info" />
        <TimelineContent>
          <TimelineTitle>Onboarding scheduled</TimelineTitle>
          <TimelineTime>Jan 18, 2024</TimelineTime>
          <TimelineDescription>
            A team member will reach out to schedule your onboarding call.
          </TimelineDescription>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};
