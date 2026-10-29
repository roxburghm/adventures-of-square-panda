// ================================================================
//  LEVEL THEMES
//  Each level picks a theme. A theme sets the sky, the hills in the
//  background and the colour of the ground and grass.
//  Add your own: copy one, give it a new name, change the colours.
// ================================================================

export const THEMES = {
  meadow: {
    name: 'Sunny Meadow',
    sky: ['#8fd7ff', '#effbff'],
    far: '#bfe6ad', near: '#8fd07c', hills: 'round',
    cap: '#69c44a', cap2: '#8be06a', dirt: '#b97a45', dirt2: '#9d6330',
    clouds: '#ffffff',
  },
  beach: {
    name: 'Shark Beach',
    sky: ['#62cdfb', '#fff4cf'],
    far: '#7fd3e8', near: '#ffd27f', hills: 'dunes',
    cap: '#f3d27a', cap2: '#ffeaa8', dirt: '#dfb064', dirt2: '#c8964a',
    clouds: '#ffffff',
  },
  snow: {
    name: 'Frosty Peaks',
    sky: ['#a9c9f2', '#f4f9ff'],
    far: '#d9e7f7', near: '#b5cde8', hills: 'pointy',
    cap: '#ffffff', cap2: '#e9f4ff', dirt: '#8f9bb3', dirt2: '#7a869f',
    clouds: '#ffffff',
  },
  volcano: {
    name: 'Fire Mountain',
    sky: ['#4a2358', '#ff9a5c'],
    far: '#7a2f4b', near: '#9c3d3a', hills: 'pointy',
    cap: '#4e3f3f', cap2: '#6b5555', dirt: '#5d4242', dirt2: '#47302f',
    clouds: '#6b4a5e',
  },
  night: {
    name: 'Moonlit Bamboo',
    sky: ['#191d44', '#4c5199'],
    far: '#2d3468', near: '#242a59', hills: 'round',
    cap: '#3f8f6a', cap2: '#5bb48b', dirt: '#544a70', dirt2: '#433a5c',
    clouds: '#5a5f9e', stars: true,
  },
};

export const DEFAULT_THEME = 'meadow';

export function getTheme(id) {
  return THEMES[id] ?? THEMES[DEFAULT_THEME];
}
