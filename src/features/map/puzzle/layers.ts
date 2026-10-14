import type { FilterSpecification, LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { MapTokens } from '../tokens';

export const PUZZLE_SOURCE = 'puzzle';
export const PUZZLE_REGIONS_SOURCE = 'puzzle-regions';

/** 국기 퍼즐은 유럽~나라 줌에서 보이고, 도시 줌(z8+)에서는 상세 지도를 가리지 않게 사라진다 */
const FADE_START = 6.5;
const FADE_END = 8.5;
export const PUZZLE_OPACITY = 0.92;

export const paintedFilter = (painted: string[]): FilterSpecification => [
  'in',
  ['get', 'regionId'],
  ['literal', painted],
];

/** 방문한 나라의 아직 안 칠한 조각 (미방문 나라는 표시 안 함) */
export const emptyFilter = (painted: string[], countries: string[]): FilterSpecification => [
  'all',
  ['in', ['get', 'country'], ['literal', countries]],
  ['!', ['in', ['get', 'regionId'], ['literal', painted]]],
];

export function puzzleLayers(t: MapTokens): LayerSpecification[] {
  const none = paintedFilter([]);
  return [
    {
      id: 'puzzle-fill',
      type: 'fill',
      source: PUZZLE_SOURCE,
      filter: none,
      paint: {
        'fill-color': ['get', 'color'],
        // appear: 새 조각이 칠해질 때 0 → 1 (feature-state)
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          FADE_START,
          ['*', PUZZLE_OPACITY, ['coalesce', ['feature-state', 'appear'], 1]],
          FADE_END,
          0,
        ],
        'fill-antialias': true,
      },
    },
    {
      // 나라 완성 시 한 번 반짝임 (feature-state flash 0 → 1 → 0)
      id: 'puzzle-flash',
      type: 'fill',
      source: PUZZLE_SOURCE,
      filter: none,
      paint: {
        'fill-color': t.tagText,
        'fill-opacity': ['*', 0.65, ['coalesce', ['feature-state', 'flash'], 0]],
      },
    },
    {
      id: 'puzzle-line-empty',
      type: 'line',
      source: PUZZLE_REGIONS_SOURCE,
      filter: emptyFilter([], []),
      paint: {
        'line-color': t.text2,
        'line-width': 1,
        'line-dasharray': [2, 2],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], FADE_START, 0.7, FADE_END + 0.5, 0],
      },
    },
    {
      id: 'puzzle-line-painted',
      type: 'line',
      source: PUZZLE_REGIONS_SOURCE,
      filter: none,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': t.tagText,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 7, 1.6],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], FADE_START, 0.95, FADE_END, 0],
      },
    },
  ];
}
