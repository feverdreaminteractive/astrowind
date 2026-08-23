// The Fever Dream Screens catalog — screen savers ported from Ryan's old
// Quartz Composer patches in ~/Downloads/aim/. Each entry drives both the
// /downloads listing card and its dedicated /downloads/<slug> page.
export interface ScreensaverEntry {
  slug: string;
  name: string;
  sourcePatch: string; // the original .qtz this was ported from
  bundleId: string; // for the tccutil reset command
  zipFile: string; // filename under public/downloads/
}

export const SCREENSAVER_CATALOG: ScreensaverEntry[] = [
  {
    slug: 'grid',
    name: 'Fever Dream Grid',
    sourcePatch: 'moire2.qtz',
    bundleId: 'com.feverdream.grid.saver',
    zipFile: 'Grid.zip',
  },
  {
    slug: 'spiral',
    name: 'Fever Dream Spiral',
    sourcePatch: 'spiral.qtz',
    bundleId: 'com.feverdream.spiral.saver',
    zipFile: 'Spiral.zip',
  },
  {
    slug: 'hypno',
    name: 'Fever Dream Hypno',
    sourcePatch: 'hypnosquare.qtz',
    bundleId: 'com.feverdream.hypno.saver',
    zipFile: 'Hypno.zip',
  },
  {
    slug: 'chevrons',
    name: 'Fever Dream Chevrons',
    sourcePatch: 'chevrons.qtz',
    bundleId: 'com.feverdream.chevrons.saver',
    zipFile: 'Chevrons.zip',
  },
  {
    slug: 'sunburst',
    name: 'Fever Dream Sunburst',
    sourcePatch: 'sunburst.qtz',
    bundleId: 'com.feverdream.sunburst.saver',
    zipFile: 'Sunburst.zip',
  },
  {
    slug: 'bloom',
    name: 'Fever Dream Bloom',
    sourcePatch: 'PsychCir2.qtz',
    bundleId: 'com.feverdream.bloom.saver',
    zipFile: 'Bloom.zip',
  },
];
