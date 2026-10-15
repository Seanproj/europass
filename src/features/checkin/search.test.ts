import { describe, expect, it } from 'vitest';
import { CITIES, COUNTRIES, getCity } from '../../data/cities';
import { buildIndex, cityNear, distanceKm, nearestCities, normalize, searchCities } from './search';

const index = buildIndex(CITIES, COUNTRIES);
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

  it('나라 이름(한글·영어·별칭)이면 그 나라 도시를 큰 도시부터', () => {
    for (const q of ['독일', 'germany', 'Deutschland']) {
      const hits = searchCities(index, q, 60);
      expect(hits.length, q).toBeGreaterThan(10);
      expect(
        hits.every((h) => h.city.country === 'DE'),
        q,
      ).toBe(true);
      expect(hits[0]!.city.tier, q).toBe(1);
      expect(hits[0]!.country, q).toBe('DE');
    }
    // 초성도: 이름이 맞는 도시 뒤에 독일 도시들
    expect(searchCities(index, 'ㄷㅇ', 60).some((h) => h.country === 'DE')).toBe(true);
    expect(ids('스페인')[0]).toBe('es-madrid');
    // 영문 3자 미만은 나라로 보지 않는다 ("uk"는 Banja L-uk-a 같은 도시 이름 일치만)
    expect(searchCities(index, 'uk', 60).some((h) => h.country)).toBe(false);
    expect(searchCities(index, 'england', 60).every((h) => h.city.country === 'GB')).toBe(true);
    expect(searchCities(index, 'czech', 60)[0]!.city.id).toBe('cz-prague');
  });

  it('도시 이름 일치가 나라 도시보다 먼저 (룩셈부르크 → 도시 룩셈부르크, 그다음 나머지)', () => {
    const hits = searchCities(index, '룩셈부르크', 60);
    expect(hits[0]).toMatchObject({ city: { id: 'lu-luxembourg' } });
    expect(hits[0]!.country).toBeUndefined();
    expect(hits.slice(1).every((h) => h.country === 'LU')).toBe(true);
    expect(new Set(hits.map((h) => h.city.id)).size).toBe(hits.length);
  });

  it('한 글자나 일부만 맞는 나라 이름으로는 도시를 쏟아내지 않는다', () => {
    expect(searchCities(index, '독', 60).some((h) => h.country)).toBe(false);
    expect(searchCities(index, 'many', 60).some((h) => h.country)).toBe(false);
  });

  it('한/영 전환을 잊고 쳐도 찾는다', () => {
    expect(ids('vkfl')[0]).toBe('fr-paris'); // 파리
    expect(ids('vmfkgk')[0]).toBe('cz-prague'); // 프라하
    expect(ids('ㅔㄱㅁㅎㅕㄷ')[0]).toBe('cz-prague'); // prague
    expect(ids('dlxkfldk')).toEqual([]); // "이타리아"는 오타라 결과 없음
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
