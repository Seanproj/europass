import { describe, expect, it } from 'vitest';
import { countryProgress, newlyCompleted, paintedRegions, puzzleColor, puzzleSourceData } from './puzzle';
import type { City } from '../../../data/types';

const city = (id: string, country: string, regionId: string) => ({ id, country, regionId }) as City;
const CITIES = new Map(
  [
    city('de-munich', 'DE', 'de-munich'),
    city('de-augsburg', 'DE', 'de-munich'),
    city('de-berlin', 'DE', 'de-berlin'),
    city('at-vienna', 'AT', 'at-vienna'),
  ].map((c) => [c.id, c]),
);
const REGIONS = [
  { id: 'de-munich', country: 'DE' },
  { id: 'de-berlin', country: 'DE' },
  { id: 'de-hamburg', country: 'DE' },
  { id: 'at-vienna', country: 'AT' },
];

describe('방문 → 칠할 조각', () => {
  it('같은 조각의 도시를 여러 곳 가도 조각은 하나', () => {
    const painted = paintedRegions(['de-munich', 'de-augsburg'], (id) => CITIES.get(id));
    expect([...painted]).toEqual(['de-munich']);
  });

  it('모르는 도시 id는 무시한다', () => {
    expect(paintedRegions(['nowhere'], (id) => CITIES.get(id)).size).toBe(0);
  });

  it('나라별 진행과 완성', () => {
    const painted = paintedRegions(['de-munich', 'de-berlin', 'at-vienna'], (id) => CITIES.get(id));
    const p = countryProgress(painted, REGIONS);
    expect(p.get('DE')).toEqual({ painted: 2, total: 3, complete: false });
    expect(p.get('AT')).toEqual({ painted: 1, total: 1, complete: true });
  });

  it('새로 완성된 나라만 골라낸다', () => {
    const before = countryProgress(new Set(['de-munich']), REGIONS);
    const after = countryProgress(new Set(['de-munich', 'at-vienna']), REGIONS);
    expect(newlyCompleted(before, after)).toEqual(['AT']);
    expect(newlyCompleted(after, after)).toEqual([]);
  });
});

describe('국기 퍼즐 색', () => {
  it('채도를 82%로 낮춘다 (밝기는 그대로)', () => {
    expect(puzzleColor('#FF0000', '#4A4B50')).toBe('#e81717');
    expect(puzzleColor('#FFFFFF', '#4A4B50')).toBe('#ffffff');
  });

  it('국기의 검정은 테마의 --flag-black으로 바꾼다', () => {
    expect(puzzleColor('#000000', '#4a4b50')).toBe('#4a4b50');
  });

  it('소스 데이터에 순서대로 id를 붙인다', () => {
    const data = puzzleSourceData(
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { regionId: 'a', country: 'DE', color: '#000000' },
            geometry: { type: 'MultiPolygon', coordinates: [] },
          },
          {
            type: 'Feature',
            properties: { regionId: 'a', country: 'DE', color: '#DD0000' },
            geometry: { type: 'MultiPolygon', coordinates: [] },
          },
        ],
      },
      '#1b1b1b',
    );
    expect(data.features.map((f) => f.id)).toEqual([0, 1]);
    expect(data.features[0]!.properties.color).toBe('#1b1b1b');
  });
});
