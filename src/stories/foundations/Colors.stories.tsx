import React from "react";
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-16 w-full rounded-lg border border-border ${className}`} />
      <span className="font-mono text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

const grayscale = [
  { step: '50', className: 'bg-primary-50' },
  { step: '100', className: 'bg-primary-100' },
  { step: '200', className: 'bg-primary-200' },
  { step: '300', className: 'bg-primary-300' },
  { step: '400', className: 'bg-primary-400' },
  { step: '500', className: 'bg-primary-500' },
  { step: '600', className: 'bg-primary-600' },
  { step: '700', className: 'bg-primary-700' },
  { step: '800', className: 'bg-primary-800' },
  { step: '900', className: 'bg-primary-900' },
  { step: '950', className: 'bg-primary-950' },
];

export const Grayscale: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-11">
      {grayscale.map((g) => (
        <Swatch key={g.step} name={`primary-${g.step}`} className={g.className} />
      ))}
    </div>
  ),
};

export const Semantic: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Swatch name="background / foreground" className="bg-background" />
      <Swatch name="card" className="bg-card" />
      <Swatch name="popover" className="bg-popover" />
      <Swatch name="muted" className="bg-muted" />
      <Swatch name="accent" className="bg-accent" />
      <Swatch name="border" className="bg-border" />
      <Swatch name="primary" className="bg-primary" />
      <Swatch name="secondary" className="bg-secondary" />
    </div>
  ),
};

export const State: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Swatch name="destructive" className="bg-destructive" />
      <Swatch name="success" className="bg-success" />
      <Swatch name="warning" className="bg-warning" />
      <Swatch name="info" className="bg-info" />
    </div>
  ),
};
