import { describe, expect, it } from 'vitest';
import { CITIES, getCity } from '../../data/cities';
import { buildIndex, cityNear, distanceKm, nearestCities, normalize, searchCities } from './search';

const index = buildIndex(CITIES);
const ids = (q: string, n = 3) =>
  searchCities(index, q)
    .slice(0, n)
    .map((h) => h.city.id);

describe('도시 검색', () => {
  it('한글 초성: "ㅍㄹㅎ" → 프라하', () => {
    expect(ids('ㅍㄹㅎ')[0]).toBe('cz-prague');
  });

  it('한글, 영어, 현지어 이름 모두', () => {
    expect(ids('프라')[0]).toBe('cz-prague');
    expect(ids('prague')[0]).toBe('cz-prague');
    expect(ids('Praha')[0]).toBe('cz-prague');
    expect(ids('münchen')[0]).toBe('de-munich');
    expect(ids('munchen')[0]).toBe('de-munich');
  });

  it('발음 구별 기호 없이 쳐도 찾는다', () => {
    expect(normalize('Kraków')).toBe('krakow');
    expect(ids('krakow')[0]).toBe('pl-krakow');
    expect(ids('cesky')[0]).toBe('cz-cesky-krumlov');
  });

  it('일치도가 같으면 tier → 인구 순 ("파"로 시작하는 도시 중 파리가 먼저)', () => {
    expect(ids('파')[0]).toBe('fr-paris');
  });

  it('완전 일치가 앞선다', () => {
    expect(ids('bath')[0]).toBe('gb-bath');
  });

  it('빈 검색어는 결과 없음', () => {
    expect(searchCities(index, '   ')).toEqual([]);
  });
});

describe('가까운 도시', () => {
  it('거리 계산 (프라하 ↔ 빈 약 250km)', () => {
    const a = getCity('cz-prague')!;
    const b = getCity('at-vienna')!;
    expect(distanceKm(a.lat, a.lon, b.lat, b.lon)).toBeGreaterThan(240);
    expect(distanceKm(a.lat, a.lon, b.lat, b.lon)).toBeLessThan(260);
  });

  it('홈 기준 가까운 미방문 도시', () => {
    const home = getCity('de-frankfurt')!;
    const near = nearestCities(CITIES, home, 5, (id) => id === 'de-frankfurt' || id === 'de-wiesbaden');
    expect(near).toHaveLength(5);
    expect(near.map((n) => n.city.id)).not.toContain('de-frankfurt');
    expect(near.map((n) => n.city.id)).not.toContain('de-wiesbaden');
    expect(near[0]!.km).toBeLessThanOrEqual(near[4]!.km);
  });

  it('현재 위치에서 30km 안의 도시만 제안', () => {
    expect(cityNear(CITIES, 50.09, 14.42)?.city.id).toBe('cz-prague');
    // 북해 한가운데
    expect(cityNear(CITIES, 56, 3)).toBeNull();
  });
});
