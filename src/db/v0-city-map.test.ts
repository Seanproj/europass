// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mapV0CityId, V0_CITY_MAP } from './v0-city-map';
import { countryOfCity } from '../data/legacy-cities';

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
  it('v0의 47개 도시를 모두 매핑한다', () => {
    expect(V0_IDS).toHaveLength(47);
    for (const id of V0_IDS) {
      expect(V0_CITY_MAP[id], id).toBeDefined();
      expect(countryOfCity(mapV0CityId(id)), id).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('모르는 id는 그대로 보존한다', () => {
    expect(mapV0CityId('somewhere')).toBe('somewhere');
  });
});
