import { describe, expect, it } from 'vitest';
import { mapV0CityId, V0_CITY_MAP } from './v0-city-map';
import { getCity } from '../data/cities';

const V0_IDS = [
  'berlin',
  'munich',
  'hamburg',
  'frankfurt',
  'cologne',
  'dresden',
  'heidelberg',
  'paris',
  'nice',
  'lyon',
  'amsterdam',
  'brussels',
  'bruges',
  'luxembourg',
  'london',
  'edinburgh',
  'dublin',
  'vienna',
  'salzburg',
  'hallstatt',
  'zurich',
  'interlaken',
  'prague',
  'budapest',
  'krakow',
  'warsaw',
  'ljubljana',
  'rome',
  'florence',
  'venice',
  'milan',
  'barcelona',
  'madrid',
  'seville',
  'lisbon',
  'porto',
  'athens',
  'santorini',
  'dubrovnik',
  'malta',
  'copenhagen',
  'stockholm',
  'oslo',
  'bergen',
  'helsinki',
  'reykjavik',
  'tallinn',
];

describe('v0 도시 id 매핑', () => {
  it('v0의 47개 도시를 모두 cities.json의 도시로 매핑한다', () => {
    expect(V0_IDS).toHaveLength(47);
    expect(Object.keys(V0_CITY_MAP).sort()).toEqual([...V0_IDS].sort());
    for (const id of V0_IDS) {
      const city = getCity(mapV0CityId(id));
      expect(city, id).toBeDefined();
    }
  });

  it('도시마다 다른 v1 id로 매핑한다', () => {
    expect(new Set(Object.values(V0_CITY_MAP)).size).toBe(47);
  });

  it('나라가 v0와 같다', () => {
    expect(getCity(mapV0CityId('prague'))?.country).toBe('CZ');
    expect(getCity(mapV0CityId('malta'))?.country).toBe('MT');
    expect(getCity(mapV0CityId('reykjavik'))?.country).toBe('IS');
  });

  it('이미 v1 id이거나 모르는 id는 그대로 보존한다', () => {
    expect(mapV0CityId('cz-prague')).toBe('cz-prague');
    expect(mapV0CityId('somewhere')).toBe('somewhere');
    expect(mapV0CityId('toString')).toBe('toString');
  });
});
