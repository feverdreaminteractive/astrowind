import React from "react";
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sizes = [
  { name: 'text-xs', className: 'text-xs' },
  { name: 'text-sm', className: 'text-sm' },
  { name: 'text-base', className: 'text-base' },
  { name: 'text-lg', className: 'text-lg' },
  { name: 'text-xl', className: 'text-xl' },
  { name: 'text-2xl', className: 'text-2xl' },
  { name: 'text-3xl', className: 'text-3xl' },
  { name: 'text-4xl', className: 'text-4xl' },
  { name: 'text-5xl', className: 'text-5xl' },
  { name: 'text-6xl', className: 'text-6xl' },
];

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {sizes.map((s) => (
        <div key={s.name} className="flex items-baseline gap-4">
          <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
            {s.name}
          </span>
          <span className={s.className}>The quick brown fox</span>
        </div>
      ))}
    </div>
  ),
};

export const Families: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 font-mono text-xs text-muted-foreground">
          font-sans (Geist Variable) &mdash; body text
        </div>
        <p className="font-sans text-lg">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <div>
        <div className="mb-1 font-mono text-xs text-muted-foreground">
          font-primary (Sora) &mdash; heading font token
        </div>
        <p className="font-primary text-lg">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <div>
        <div className="mb-1 font-mono text-xs text-muted-foreground">
          font-secondary (Inter) &mdash; secondary font token
        </div>
        <p className="font-secondary text-lg">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
    </div>
  ),
};

export const Headings: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <h1 className="text-5xl">Heading 1</h1>
      <h2 className="text-4xl">Heading 2</h2>
      <h3 className="text-3xl">Heading 3</h3>
      <h4 className="text-2xl">Heading 4</h4>
      <h5 className="text-xl">Heading 5</h5>
      <h6 className="text-lg">Heading 6</h6>
    </div>
  ),
};
