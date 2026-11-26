// Texture catalog. Files Claude unpacked from three-globe@2 and globe.gl.zip.
// Served from jsDelivr so GitHub Pages stays client-side and the repo stays small.
// Credits: vasturiano/three-globe (MIT), vasturiano/globe.gl (MIT),
// clouds.png noted upstream as from turban/webgl-earth.

export const JSDELIVR_THREE_GLOBE_IMG =
  'https://cdn.jsdelivr.net/npm/three-globe@2/example/img';

export const JSDELIVR_GLOBE_GL =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example';

export const MAPS = {
  earthBlueMarble: `${JSDELIVR_THREE_GLOBE_IMG}/earth-blue-marble.jpg`,
  earthDay: `${JSDELIVR_THREE_GLOBE_IMG}/earth-day.jpg`,
  earthNight: `${JSDELIVR_THREE_GLOBE_IMG}/earth-night.jpg`,
  earthTopology: `${JSDELIVR_THREE_GLOBE_IMG}/earth-topology.png`,
  earthWater: `${JSDELIVR_THREE_GLOBE_IMG}/earth-water.png`,
  nightSky: `${JSDELIVR_THREE_GLOBE_IMG}/night-sky.png`,
  clouds: `${JSDELIVR_GLOBE_GL}/clouds/clouds.png`,
  lunarSurface: `${JSDELIVR_GLOBE_GL}/moon-landing-sites/lunar_surface.jpg`,
  lunarBump: `${JSDELIVR_GLOBE_GL}/moon-landing-sites/lunar_bumpmap.jpg`
};

// How to retint an Earth map into a stand-in for another body.
export const BODY_FILTER = {
  mercury: { hue: -20, sat: 0.15, light: 0.55 },
  venus: { hue: 35, sat: 0.85, light: 0.7 },
  earth: { hue: 0, sat: 1, light: 1 },
  moon: { map: 'lunarSurface', bump: 'lunarBump' },
  mars: { hue: -25, sat: 1.4, light: 0.65 },
  jupiter: { hue: 18, sat: 1.1, light: 0.85 },
  saturn: { hue: 28, sat: 0.9, light: 0.8 },
  uranus: { hue: 160, sat: 0.7, light: 0.75 },
  neptune: { hue: 210, sat: 1.1, light: 0.55 }
};
