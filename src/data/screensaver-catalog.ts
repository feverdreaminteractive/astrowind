// The Fever Dream Screens catalog — screen savers ported from Ryan's old
// Quartz Composer patches in ~/Downloads/aim/. Each entry drives its card
// on the /downloads listing page (a direct download, no per-item page).
export interface ScreensaverEntry {
  slug: string;
  name: string;
  sourcePatch: string; // the original .qtz this was ported from
  bundleId: string; // this product's signed bundle identifier
  zipFile: string; // filename under public/downloads/
}

export const SCREENSAVER_CATALOG: ScreensaverEntry[] = [
  {
    slug: 'drippy',
    name: 'Drippy',
    sourcePatch: 'Moire1.qtz, OpArtSeries1-5.qtz',
    bundleId: 'com.feverdream.drippy.saver',
    zipFile: 'Drippy.zip',
  },
  {
    slug: 'moire',
    name: 'Moire',
    sourcePatch: 'moire2.qtz',
    bundleId: 'com.feverdream.moire.saver',
    zipFile: 'Moire.zip',
  },
  {
    slug: 'spiral',
    name: 'Spiral',
    sourcePatch: 'spiral.qtz',
    bundleId: 'com.feverdream.spiral.saver',
    zipFile: 'Spiral.zip',
  },
  {
    slug: 'hypno',
    name: 'Hypno',
    sourcePatch: 'hypnosquare.qtz',
    bundleId: 'com.feverdream.hypno.saver',
    zipFile: 'Hypno.zip',
  },
  {
    slug: 'chevrons',
    name: 'Chevrons',
    sourcePatch: 'chevrons.qtz',
    bundleId: 'com.feverdream.chevrons.saver',
    zipFile: 'Chevrons.zip',
  },
  {
    slug: 'bloom',
    name: 'Bloom',
    sourcePatch: 'PsychCir2.qtz',
    bundleId: 'com.feverdream.bloom.saver',
    zipFile: 'Bloom.zip',
  },
  {
    slug: 'halo',
    name: 'Halo',
    sourcePatch: 'OpArtSeries1-8.qtz',
    bundleId: 'com.feverdream.halo.saver',
    zipFile: 'Halo.zip',
  },
  {
    slug: 'vortex',
    name: 'Vortex',
    sourcePatch: 'hw5.qtz',
    bundleId: 'com.feverdream.vortex.saver',
    zipFile: 'Vortex.zip',
  },
  {
    slug: 'shatter',
    name: 'Shatter',
    sourcePatch: 'viz28.qtz',
    bundleId: 'com.feverdream.shatter.saver',
    zipFile: 'Shatter.zip',
  },
];
