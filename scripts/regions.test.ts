// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import area from '@turf/area';
import intersect from '@turf/intersect';
import { featureCollection, multiPolygon } from '@turf/helpers';
import { beforeAll, describe, expect, it } from 'vitest';
import { ROOT } from './lib/cache';
import { COUNTRIES } from './lib/countries';
import { loadCountryShapes, type CountryShape } from './lib/geo';
import { FLAGS } from '../src/data/flags';
import type { City, RegionsData } from '../src/data/types';

const read = <T>(file: string) => JSON.parse(readFileSync(join(ROOT, 'src', 'data', file), 'utf8')) as T;
const cities = read<City[]>('cities.json');
const { regions, bboxes } = read<RegionsData>('regions.json');
const flagPieces = read<{ features: { properties: { regionId: string; color: string } }[] }>(
  'regions-flag.json',
);

describe('국기 퍼즐 조각', () => {
  let shapes: Map<string, CountryShape>;
  beforeAll(() => {
    shapes = loadCountryShapes();
  });

  it('나라마다 조각이 3~12개이고 bbox가 있다', () => {
    for (const c of COUNTRIES) {
      const n = regions.filter((r) => r.country === c.code).length;
      expect(n, c.code).toBeGreaterThanOrEqual(3);
      expect(n, c.code).toBeLessThanOrEqual(12);
      expect(bboxes[c.code], c.code).toHaveLength(4);
    }
  });

  it('조각 id는 대표 도시 id와 같고 대표 도시는 자기 조각에 속한다', () => {
    const byId = new Map(cities.map((c) => [c.id, c]));
    for (const r of regions) {
      expect(r.id).toBe(r.anchorCityId);
      const anchor = byId.get(r.anchorCityId);
      expect(anchor?.regionId, r.id).toBe(r.id);
      expect(r.name.ko, r.id).toBe(`${anchor!.name.ko} 지역`);
    }
  });

  it('모든 도시가 regionId를 가진다', () => {
    const ids = new Set(regions.map((r) => r.id));
    for (const c of cities) expect(ids.has(c.regionId), c.id).toBe(true);
  });

  it('조각은 나라 경계 안에 있다 (단순화 오차 3% 이내)', () => {
    for (const r of regions) {
      const piece = multiPolygon(r.polygon);
      const inside = intersect(featureCollection([piece, shapes.get(r.country)!]));
      const ratio = inside ? area(inside) / area(piece) : 0;
      expect(ratio, r.id).toBeGreaterThan(0.97);
    }
  });

  it('조각들이 나라 대부분을 덮는다', () => {
    for (const c of COUNTRIES) {
      const total = regions
        .filter((r) => r.country === c.code)
        .reduce((s, r) => s + area(multiPolygon(r.polygon)), 0);
      const ratio = total / area(shapes.get(c.code)!);
      expect(ratio, c.code).toBeGreaterThan(0.9);
      expect(ratio, c.code).toBeLessThan(1.05);
    }
  });

  it('조각마다 국기 조각이 있고, 색은 그 나라 국기 색이다', () => {
    const colorsOf = new Map(
      COUNTRIES.map((c) => [c.code, new Set(FLAGS[c.code]!.shapes.map((s) => s.color))]),
    );
    const countryOf = new Map(regions.map((r) => [r.id, r.country]));
    for (const r of regions) {
      expect(
        flagPieces.features.some((f) => f.properties.regionId === r.id),
        r.id,
      ).toBe(true);
    }
    for (const f of flagPieces.features) {
      const country = countryOf.get(f.properties.regionId)!;
      expect(colorsOf.get(country)!.has(f.properties.color), f.properties.regionId).toBe(true);
    }
  });

  it('모든 나라에 국기 정의가 있다', () => {
    for (const c of COUNTRIES) expect(FLAGS[c.code], c.code).toBeDefined();
  });
});
