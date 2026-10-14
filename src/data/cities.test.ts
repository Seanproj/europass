// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CITIES, COUNTRIES, countryOfCity, getCity } from './cities';
import regionsData from './regions.json';
import type { RegionsData } from './types';

const { regions } = regionsData as unknown as RegionsData;

describe('cities.json 무결성', () => {
  it('600~900개 도시', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(600);
    expect(CITIES.length).toBeLessThanOrEqual(900);
  });

  it('id가 겹치지 않고 "국가코드-슬러그" 형식이다', () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    for (const c of CITIES) {
      expect(c.id, c.id).toMatch(/^[a-z]{2}-[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(c.id.slice(0, 2), c.id).toBe(c.country.toLowerCase());
    }
  });

  it('좌표가 유럽 범위 안에 있다', () => {
    for (const c of CITIES) {
      expect(c.lat, c.id).toBeGreaterThan(27);
      expect(c.lat, c.id).toBeLessThan(72);
      expect(c.lon, c.id).toBeGreaterThan(-32);
      expect(c.lon, c.id).toBeLessThan(45);
    }
  });

  it('모든 도시의 나라가 countries.json에 있고, 나라마다 도시가 3개 이상이다', () => {
    const codes = new Set(COUNTRIES.map((c) => c.code));
    for (const c of CITIES) expect(codes.has(c.country), c.id).toBe(true);
    for (const country of COUNTRIES) {
      const count = CITIES.filter((c) => c.country === country.code).length;
      expect(count, country.code).toBeGreaterThanOrEqual(3);
      expect(country.cityCount, country.code).toBe(count);
    }
  });

  it('나라마다 수도가 하나씩 있다', () => {
    for (const country of COUNTRIES) {
      const capitals = CITIES.filter((c) => c.country === country.code && c.capital);
      expect(
        capitals.map((c) => c.id),
        country.code,
      ).toHaveLength(1);
      expect(capitals[0]!.tier, country.code).toBe(1);
    }
  });

  it('tier1(상징 도시)은 100~150곳', () => {
    const n = CITIES.filter((c) => c.tier === 1).length;
    expect(n).toBeGreaterThanOrEqual(100);
    expect(n).toBeLessThanOrEqual(150);
  });

  it('한글 이름 누락률 2% 미만', () => {
    const missing = CITIES.filter((c) => !c.name.ko.trim());
    expect(missing.length / CITIES.length).toBeLessThan(0.02);
  });

  it('이름 세 가지가 모두 채워져 있다', () => {
    for (const c of CITIES) {
      expect(c.name.en, c.id).not.toBe('');
      expect(c.name.local, c.id).not.toBe('');
    }
  });

  it('모든 도시가 같은 나라의 국기 퍼즐 조각에 속한다', () => {
    const byId = new Map(regions.map((r) => [r.id, r]));
    for (const c of CITIES) {
      const region = byId.get(c.regionId);
      expect(region, c.id).toBeDefined();
      expect(region!.country, c.id).toBe(c.country);
    }
  });

  it('조회 함수', () => {
    expect(getCity('cz-prague')?.name.ko).toBe('프라하');
    expect(countryOfCity('de-munich')).toBe('DE');
    expect(countryOfCity('nowhere')).toBeUndefined();
  });

  it('여행지로 유명한 작은 도시도 들어 있다', () => {
    for (const id of [
      'at-hallstatt',
      'de-rothenburg-ob-der-tauber',
      'cz-cesky-krumlov',
      'fr-mont-saint-michel',
      'ch-zermatt',
    ]) {
      expect(getCity(id), id).toBeDefined();
    }
  });
});
