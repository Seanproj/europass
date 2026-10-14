import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { NAME_KO, fallbackStyle, isBoundaryLayer, themeStyle } from './style';
import type { MapTokens } from './tokens';

const T = {
  theme: 'light',
  land: '#e9e7e1',
  water: '#e3e7e8',
  text: '#15171a',
  text2: '#6b6f76',
  dBg: '#fbf7ef',
  dStreet: '#e6dccb',
  dRoad: '#ffffff',
  dWater: '#a9d0e4',
  dPark: '#c9e0b5',
  dRoof: '#e9a584',
} as MapTokens;

// positron과 같은 OpenMapTiles 스키마의 축약본
const BASE: StyleSpecification = {
  version: 8,
  sources: { openmaptiles: { type: 'vector', url: 'x' } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f0f0f0' } },
    { id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park' },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
    { id: 'building', type: 'fill', source: 'openmaptiles', 'source-layer': 'building' },
    { id: 'highway_major_casing', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
    { id: 'highway_major_inner', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
    { id: 'boundary_2', type: 'line', source: 'openmaptiles', 'source-layer': 'boundary' },
    {
      id: 'highway-shield-non-us',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      layout: { 'icon-image': 'road', 'text-field': '{ref}' },
    },
    {
      id: 'label_city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 3,
      layout: { 'text-field': '{name:latin}' },
    },
    {
      id: 'label_country_1',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      layout: { 'text-field': '{name}' },
    },
  ],
};

const byId = (s: StyleSpecification, id: string) => s.layers.find((l) => l.id === id);
/** 레이어의 paint/layout 속성 하나 */
const prop = (s: StyleSpecification, id: string, group: 'paint' | 'layout', key: string) =>
  (byId(s, id) as Record<string, Record<string, unknown> | undefined> | undefined)?.[group]?.[key];

describe('지도 스타일 (토큰 색 덮어쓰기)', () => {
  const s = themeStyle(BASE, T);

  it('라벨은 name:ko → name 순서', () => {
    expect(prop(s, 'label_city', 'layout', 'text-field')).toEqual(NAME_KO);
  });

  it('도시 라벨은 안개가 걷히는 줌(z8)부터, 나라 이름과 도로 방패는 숨긴다', () => {
    expect(byId(s, 'label_city')?.minzoom).toBe(8);
    expect(prop(s, 'label_country_1', 'layout', 'visibility')).toBe('none');
    expect(byId(s, 'highway-shield-non-us')).toBeUndefined();
  });

  it('유럽 전체에서는 회색, 도시 줌에서는 상세 색', () => {
    expect(prop(s, 'background', 'paint', 'background-color')).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      5,
      T.land,
      9,
      T.dBg,
    ]);
    expect(prop(s, 'building', 'paint', 'fill-color')).toBe(T.dRoof);
    expect(prop(s, 'highway_major_casing', 'paint', 'line-color')).toBe(T.dStreet);
    expect(prop(s, 'highway_major_inner', 'paint', 'line-color')).toBe(T.dRoad);
  });

  it('원본 스타일은 건드리지 않는다', () => {
    expect(BASE.layers[0]).toEqual({
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f0f0f0' },
    });
  });

  it('렌즈 스냅샷용은 라벨과 경계 없이 상세 색만', () => {
    const snap = themeStyle(BASE, T, true);
    expect(snap.layers.some((l) => l.type === 'symbol')).toBe(false);
    expect(snap.layers.some((l) => isBoundaryLayer(l))).toBe(false);
    expect(prop(snap, 'water', 'paint', 'fill-color')).toBe(T.dWater);
  });

  it('나라 경계 레이어를 찾는다', () => {
    expect(s.layers.filter(isBoundaryLayer).map((l) => l.id)).toEqual(['boundary_2']);
  });

  it('타일 서버가 막혔을 때의 최소 스타일', () => {
    const f = fallbackStyle(T);
    expect(f.layers).toHaveLength(1);
    expect(f.glyphs).toContain('{fontstack}');
  });
});
