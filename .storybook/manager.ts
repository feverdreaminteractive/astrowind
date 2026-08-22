import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

const theme = create({
  base: 'dark',
  brandTitle: 'Ryan Clayton',
  brandUrl: 'https://ryanclayton.io',
  brandImage: '/logoRC_sdr_reference.jpg',
  brandTarget: '_self',
});

addons.setConfig({
  theme,
});
