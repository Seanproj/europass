import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { City } from '../../../data/types';
import type { MapTokens } from '../tokens';

export const CITY_SOURCE = 'cities';
export const HOME_ICON = 'home-icon';
/** 등급별로 보이기 시작하는 줌 */
export const CITY_MINZOOM = { 1: 5, 2: 6.5, 3: 8 } as const;
export const CITY_DOT_LAYERS = ['city-dot-1', 'city-dot-2', 'city-dot-3'];

export interface CityProps {
  id: string;
  name: string;
  tier: number;
  visited: boolean;
  home: boolean;
}

export function citySourceData(cities: City[], visits: Map<string, number>, homeId: string | undefined) {
  return {
    type: 'FeatureCollection' as const,
    features: cities.map((c) => ({
      type: 'Feature' as const,
      properties: {
        id: c.id,
        name: c.name.ko,
        tier: c.tier,
        visited: visits.has(c.id),
        home: c.id === homeId,
      } satisfies CityProps,
      geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] },
    })),
  };
}

export function cityLayers(t: MapTokens): LayerSpecification[] {
  const dots = ([1, 2, 3] as const).map((tier): LayerSpecification => ({
    id: `city-dot-${tier}`,
    type: 'circle',
    source: CITY_SOURCE,
    minzoom: CITY_MINZOOM[tier],
    filter: ['all', ['==', ['get', 'tier'], tier], ['!', ['get', 'home']]],
    paint: {
      'circle-color': ['case', ['get', 'visited'], t.accent, t.text2],
      'circle-radius': ['case', ['get', 'visited'], 5 - tier * 0.5, 3.2 - tier * 0.5],
      'circle-opacity': ['case', ['get', 'visited'], 1, 0.75],
      'circle-stroke-color': t.surface,
      'circle-stroke-width': ['case', ['get', 'visited'], 1.5, 0],
    },
  }));
  return [
    ...dots,
    {
      id: 'city-home',
      type: 'symbol',
      source: CITY_SOURCE,
      minzoom: 3,
      filter: ['get', 'home'],
      layout: { 'icon-image': HOME_ICON, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
    },
    {
      // 렌즈가 사라지는 줌에서 방문 도시 이름. z8부터 베이스맵 라벨이 나오므로 겹치지 않게 넘겨준다
      id: 'city-label',
      type: 'symbol',
      source: CITY_SOURCE,
      minzoom: 7.5,
      maxzoom: 9,
      filter: ['get', 'visited'],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-offset': [0, 0.9],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': t.text,
        'text-halo-color': t.surface,
        'text-halo-width': 1.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 0, 7.8, 1, 8.5, 1, 9, 0],
      },
    },
  ];
}
