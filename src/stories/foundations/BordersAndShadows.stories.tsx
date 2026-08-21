import React from "react";
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/BordersAndShadows',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const radii = [
  { name: 'radius-sm', className: 'rounded-sm' },
  { name: 'radius-md', className: 'rounded-md' },
  { name: 'radius-lg', className: 'rounded-lg' },
  { name: 'radius-xl', className: 'rounded-xl' },
  { name: 'radius-2xl', className: 'rounded-2xl' },
  { name: 'radius-3xl', className: 'rounded-3xl' },
  { name: 'radius-4xl', className: 'rounded-4xl' },
];

export const Radius: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-7">
      {radii.map((r) => (
        <div key={r.name} className="flex flex-col items-center gap-2">
          <div className={`size-16 border-2 border-primary bg-muted ${r.className}`} />
          <span className="font-mono text-xs text-muted-foreground">{r.name}</span>
        </div>
      ))}
    </div>
  ),
};

const shadows = [
  { name: 'shadow-xs', className: 'shadow-xs' },
  { name: 'shadow-sm', className: 'shadow-sm' },
  { name: 'shadow-md', className: 'shadow-md' },
  { name: 'shadow-lg', className: 'shadow-lg' },
  { name: 'shadow-xl', className: 'shadow-xl' },
  { name: 'shadow-2xl', className: 'shadow-2xl' },
];

export const Shadows: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
      {shadows.map((s) => (
        <div key={s.name} className="flex flex-col items-center gap-3">
          <div className={`size-16 rounded-lg border border-border bg-card ${s.className}`} />
          <span className="font-mono text-xs text-muted-foreground">{s.name}</span>
        </div>
      ))}
    </div>
  ),
};

const borders = [
  { name: 'border-border', className: 'border-border' },
  { name: 'border-input', className: 'border-input' },
  { name: 'border-ring', className: 'border-ring' },
];

export const BorderColors: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6">
      {borders.map((b) => (
        <div key={b.name} className="flex flex-col items-center gap-2">
          <div className={`size-16 rounded-lg border-2 bg-background ${b.className}`} />
          <span className="font-mono text-xs text-muted-foreground">{b.name}</span>
        </div>
      ))}
    </div>
  ),
};
