import React from 'react';
import type { Decorator } from '@storybook/react';

export const withPortfolioTheme: Decorator = (Story) => (
  <div
    className="dark min-h-screen"
    style={{
      background: 'linear-gradient(to bottom right, #1a1a2e, #16171b, #000000)',
      color: '#fafafa',
    }}
  >
    <Story />
  </div>
);

export const withDarkTheme: Decorator = (Story) => (
  <div
    className="dark min-h-screen"
    style={{
      backgroundColor: '#16171b',
      color: '#fafafa',
    }}
  >
    <Story />
  </div>
);

export const withLightTheme: Decorator = (Story) => (
  <div
    className="min-h-screen"
    style={{
      backgroundColor: '#fafafa',
      color: '#1a1a2e',
    }}
  >
    <Story />
  </div>
);