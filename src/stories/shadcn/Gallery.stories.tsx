import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Gallery, GalleryItem } from '@/components/ui/gallery';

const meta = {
  title: 'Shadcn/Gallery',
  component: Gallery,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Gallery>;

export default meta;
type Story = StoryObj<typeof meta>;

const heights = [140, 220, 180, 260, 160, 200];

export const Masonry: Story = {
  render: () => (
    <Gallery className="w-96">
      {heights.map((h, i) => (
        <GalleryItem key={i}>
          <div
            className="flex items-center justify-center bg-muted text-sm text-muted-foreground"
            style={{ height: h }}
          >
            {i + 1}
          </div>
        </GalleryItem>
      ))}
    </Gallery>
  ),
};
