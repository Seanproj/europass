import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { BADGES, badgesToAnnounce, evaluateBadges, season } from './badges';

let n = 0;
const visit = (cityId: string, date = '2025-05-01'): Visit => ({
  id: `v${++n}`,
  cityId,
  date,
  note: '',
  photos: [],
  createdAt: 0,
  updatedAt: 0,
});

const earned = (visits: Visit[]) =>
  new Set(
    evaluateBadges(visits)
      .filter((s) => s.earned)
      .map((s) => s.badge.id),
  );
const valueOf = (visits: Visit[], id: string) => evaluateBadges(visits).find((s) => s.badge.id === id)!.value;

describe('badges', () => {
  it('정의: id가 겹치지 않고 25종 내외', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(22);
    expect(ids.length).toBeLessThanOrEqual(35);
    for (const b of BADGES) expect(b.goal).toBeGreaterThan(0);
  });

  it('기록이 없으면 아무것도 없다', () => {
    expect(earned([]).size).toBe(0);
  });

  it('첫 도장, 도시 수는 고유 도시 기준', () => {
    const vs = [visit('cz-prague'), visit('cz-prague', '2025-06-01')];
    expect(earned(vs).has('cities-1')).toBe(true);
    expect(valueOf(vs, 'cities-10')).toBe(1);
  });

  it('나라 수와 권역', () => {
    const vs = ['de-berlin', 'fr-paris', 'it-rome', 'es-madrid', 'at-vienna'].map((id) => visit(id));
    const e = earned(vs);
    expect(e.has('countries-5')).toBe(true);
    expect(e.has('countries-10')).toBe(false);
    expect(valueOf(vs, 'all-groups')).toBe(3); // central, west, south
  });

  it('값은 목표를 넘지 않는다', () => {
    const vs = ['de-berlin', 'fr-paris', 'it-rome', 'es-madrid', 'at-vienna', 'cz-prague'].map((id) =>
      visit(id),
    );
    expect(valueOf(vs, 'countries-5')).toBe(5);
  });

  it('계절 구분', () => {
    expect(season('2025-03-01')).toBe(0);
    expect(season('2025-08-31')).toBe(1);
    expect(season('2025-11-30')).toBe(2);
    expect(season('2025-12-01')).toBe(3);
    expect(season('2025-02-28')).toBe(3);
  });

  it('사계절 여행자와 사계절 단골', () => {
    const dates = ['2025-01-10', '2025-04-10', '2025-07-10', '2025-10-10'];
    const cities = ['cz-prague', 'fr-paris', 'it-rome', 'es-madrid'];
    const spread = dates.map((d, i) => visit(cities[i]!, d));
    expect(earned(spread).has('four-seasons')).toBe(true);
    expect(earned(spread).has('four-seasons-city')).toBe(false);
    const one = dates.map((d) => visit('cz-prague', d));
    expect(earned(one).has('four-seasons-city')).toBe(true);
  });

  it('한 달에 3개국: 같은 달이어야 한다', () => {
    const sameMonth = [
      visit('cz-prague', '2025-05-01'),
      visit('at-vienna', '2025-05-10'),
      visit('hu-budapest', '2025-05-31'),
    ];
    expect(earned(sameMonth).has('three-in-a-month')).toBe(true);
    const spread = [
      visit('cz-prague', '2025-05-31'),
      visit('at-vienna', '2025-06-01'),
      visit('hu-budapest', '2025-06-02'),
    ];
    expect(earned(spread).has('three-in-a-month')).toBe(false);
  });

  it('북극권', () => {
    expect(earned([visit('no-tromso')]).has('arctic')).toBe(true);
    expect(earned([visit('no-oslo')]).has('arctic')).toBe(false);
  });

  it('재방문 계열: 또 왔어요 2번, 단골 5번', () => {
    const twice = [visit('cz-prague', '2025-01-01'), visit('cz-prague', '2025-02-01')];
    expect(earned(twice).has('again')).toBe(true);
    expect(earned(twice).has('regular')).toBe(false);
    const five = [1, 2, 3, 4, 5].map((m) => visit('cz-prague', `2025-0${m}-01`));
    expect(earned(five).has('regular')).toBe(true);
  });

  it('국기 퍼즐: 모든 조각을 칠해야 완성', () => {
    // 룩셈부르크 조각 3개 (룩셈부르크·에히터나흐·비안덴)
    const partial = [visit('lu-luxembourg'), visit('lu-echternach')];
    expect(earned(partial).has('flags-1')).toBe(false);
    const full = [...partial, visit('lu-clervaux')]; // 클레르보는 비안덴 조각
    expect(earned(full).has('flags-1')).toBe(true);
    expect(valueOf(full, 'neighbors')).toBe(1);
  });

  it('알프스: 리히텐슈타인 조각까지', () => {
    const li = ['li-schaan', 'li-vaduz', 'li-balzers'].map((id) => visit(id));
    expect(valueOf(li, 'alps')).toBe(1);
  });

  it('수도, 히든젬, 독일 마스터', () => {
    const vs = [
      visit('de-berlin'),
      visit('cz-prague'),
      visit('at-melk'),
      visit('be-dinant'),
      visit('de-hamburg'),
    ];
    expect(valueOf(vs, 'capitals')).toBe(2);
    expect(valueOf(vs, 'hidden-gems')).toBe(2);
    expect(valueOf(vs, 'germany-master')).toBe(2);
  });

  it('모르는 도시 id는 무시한다', () => {
    expect(earned([visit('xx-nowhere')]).size).toBe(0);
  });
});

describe('badgesToAnnounce', () => {
  it('처음(seen 없음)에는 이미 얻은 배지를 조용히 본 것으로', () => {
    expect(badgesToAnnounce(['cities-1', 'again'], null)).toEqual({
      announce: [],
      seen: ['cities-1', 'again'],
    });
  });

  it('새로 얻은 것만 알리고, 한 번 알린 것은 다시 알리지 않는다', () => {
    const first = badgesToAnnounce(['cities-1', 'again'], ['cities-1']);
    expect(first.announce).toEqual(['again']);
    const second = badgesToAnnounce(['cities-1', 'again'], first.seen);
    expect(second.announce).toEqual([]);
  });

  it('되돌리기로 잃었다가 다시 얻어도 다시 알리지 않는다', () => {
    const after = badgesToAnnounce(['cities-1'], ['cities-1', 'again']);
    expect(after.announce).toEqual([]);
    expect(badgesToAnnounce(['cities-1', 'again'], after.seen).announce).toEqual([]);
  });
});
