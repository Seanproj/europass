import { describe, expect, it } from 'vitest';
import { COUNTRIES, getCity, getCountry } from '../../data/cities';
import regionsData from '../../data/regions.json';
import type { RegionsData } from '../../data/types';
import type { Visit } from '../../db/types';
import { countryProgress, europePercent, piecesOf, sortCountries } from './progress';

const v = (cityId: string, date: string): Visit => ({
  id: `${cityId}${date}`,
  cityId,
  date,
  note: '',
  photos: [],
  createdAt: 0,
  updatedAt: 0,
});

describe('나라별 진행', () => {
  it('조각 수는 regions.json과 같다', () => {
    const { regions } = regionsData as unknown as RegionsData;
    for (const c of COUNTRIES)
      expect(piecesOf(c.code), c.code).toBe(regions.filter((r) => r.country === c.code).length);
  });

  it('같은 조각의 도시를 여러 번 가도 조각은 하나, 도시는 따로 센다', () => {
    const p = countryProgress(
      [v('de-munich', '2025-01-01'), v('de-munich', '2026-02-01'), v('de-augsburg', '2025-05-01')],
      getCity,
    );
    const de = p.get('DE')!;
    expect(de.cities).toBe(2);
    expect(de.painted).toBe(getCity('de-augsburg')!.regionId === 'de-munich' ? 1 : 2);
    expect(de.lastVisit).toBe('2026-02-01');
    expect(p.get('FR')).toMatchObject({ painted: 0, cities: 0, lastVisit: '' });
  });

  it('모든 조각을 칠하면 완성', () => {
    const lu = ['lu-luxembourg', 'lu-echternach', 'lu-vianden'].map((id) => v(id, '2026-01-01'));
    expect(countryProgress(lu, getCity).get('LU')!.complete).toBe(true);
  });

  it('정렬: 방문한 나라(최근 순) → 미방문(가나다)', () => {
    const p = countryProgress([v('fr-paris', '2025-01-01'), v('cz-prague', '2026-01-01')], getCity);
    const sorted = sortCountries([...p.values()], (c) => getCountry(c)!.name.ko).map((x) => x.code);
    expect(sorted.slice(0, 2)).toEqual(['CZ', 'FR']);
    // 미방문은 가나다: 그리스(GR)가 네덜란드(NL)보다 앞
    expect(sorted.indexOf('GR')).toBeLessThan(sorted.indexOf('NL'));
  });

  it('유럽의 몇 %', () => {
    expect(europePercent(0)).toBe(0);
    expect(europePercent(43)).toBe(5);
  });
});
