import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import {
  Banner,
  BannerIcon,
  BannerContent,
  BannerActions,
  BannerClose,
} from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';

const meta = {
  title: 'Shadcn/Banner',
  component: Banner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Banner>
      <BannerIcon>
        <InfoIcon />
      </BannerIcon>
      <BannerContent>
        A new version of the design system is available.
      </BannerContent>
      <BannerActions>
        <Button size="sm">Update now</Button>
        <BannerClose />
      </BannerActions>
    </Banner>
  ),
};

export const WithLink: Story = {
  render: () => (
    <Banner>
      <BannerContent>
        We use cookies to improve your experience.{' '}
        <a href="#" className="underline underline-offset-4 hover:text-foreground">
          Learn more
        </a>
      </BannerContent>
      <BannerActions>
        <BannerClose />
      </BannerActions>
    </Banner>
  ),
};
