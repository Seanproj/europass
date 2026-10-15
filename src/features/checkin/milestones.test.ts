import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { earnedMilestones, milestoneText, newMilestones } from './milestones';

const v = (cityId: string, date: string, id = `${cityId}${date}`): Visit => ({
  id,
  cityId,
  date,
  note: '',
  photos: [],
  createdAt: 0,
  updatedAt: 0,
});
const ids = (list: { id: string }[]) => list.map((m) => m.id);

/** 체크인 하나를 더했을 때 새 기념 */
const added = (before: Visit[], visit: Visit, seen: string[] = []) =>
  newMilestones(before, [...before, visit], seen);

/** 서로 다른 날짜의 프라하 방문 n개 */
const pragues = (n: number) =>
  Array.from({ length: n }, (_, i) => v('cz-prague', `2025-01-${String(i + 1).padStart(2, '0')}`));

describe('기념 판정', () => {
  it('새 나라의 첫 도장은 몇 번째 나라인지와 함께', () => {
    const first = added([], v('cz-prague', '2025-05-01'));
    expect(first).toEqual([{ id: 'country:CZ', kind: 'country', country: 'CZ', ordinal: 1 }]);
    const second = added([v('cz-prague', '2025-05-01')], v('at-vienna', '2025-06-01'));
    expect(second).toEqual([{ id: 'country:AT', kind: 'country', country: 'AT', ordinal: 2 }]);
  });

  it('이미 간 나라의 다른 도시는 기념이 아니다', () => {
    expect(added([v('cz-prague', '2025-05-01')], v('cz-brno', '2025-06-01'))).toEqual([]);
    expect(added([v('cz-prague', '2025-05-01')], v('cz-prague', '2025-06-01'))).toEqual([]);
  });

  it('도장 10·25·50·100개째', () => {
    expect(ids(added(pragues(9), v('cz-prague', '2025-02-01')))).toEqual(['count:10']);
    expect(added(pragues(10), v('cz-prague', '2025-02-02'))).toEqual([]);
    expect(ids(added(pragues(24), v('cz-prague', '2025-03-01')))).toEqual(['count:25']);
    const many = Array.from({ length: 99 }, (_, i) => v('cz-prague', `2025-01-01`, `x${i}`));
    expect(ids(added(many, v('cz-prague', '2025-04-01')))).toEqual(['count:100']);
  });

  it('마지막 조각을 칠하면 국기 완성', () => {
    // 룩셈부르크: 조각 3개 (룩셈부르크·에히터나흐·비안덴)
    const before = [v('lu-luxembourg', '2025-05-01'), v('lu-echternach', '2025-05-02')];
    expect(added(before, v('lu-vianden', '2025-05-03'))).toEqual([
      { id: 'flag:LU', kind: 'flag', country: 'LU', pieces: 3 },
    ]);
    // 이미 칠한 조각의 다른 도시(클레르보 = 비안덴 조각)는 완성이 아니다
    expect(added(before, v('lu-esch-sur-alzette', '2025-05-03'))).toEqual([]);
  });

  it('겹치면 국기 → 개수 → 나라 순으로 (앞이 주인공)', () => {
    // 도장 9개 뒤 첫 룩셈부르크: 10개째 + 새 나라
    const got = added(pragues(9), v('lu-luxembourg', '2025-05-01'));
    expect(ids(got)).toEqual(['count:10', 'country:LU']);
    const before = [...pragues(7), v('lu-luxembourg', '2025-05-01'), v('lu-echternach', '2025-05-02')];
    expect(ids(added(before, v('lu-vianden', '2025-05-03')))).toEqual(['flag:LU', 'count:10']);
  });

  it('알린 적 있는 기념은 다시 알리지 않는다 (지웠다가 다시 이뤄도)', () => {
    expect(added(pragues(9), v('cz-prague', '2025-02-01'), ['count:10'])).toEqual([]);
    expect(added([], v('cz-prague', '2025-05-01'), ['country:CZ'])).toEqual([]);
  });

  it('지난 날짜로 소급한 새 나라는 날짜순으로 몇 번째인지 센다', () => {
    const got = added([v('cz-prague', '2025-05-01')], v('at-vienna', '2020-01-01'));
    expect(got[0]).toMatchObject({ id: 'country:AT', ordinal: 1 });
    // 원래 있던 체코는 이제 2번째지만 알리지 않는다
    expect(earnedMilestones([v('cz-prague', '2025-05-01'), v('at-vienna', '2020-01-01')])).toContainEqual({
      id: 'country:CZ',
      kind: 'country',
      country: 'CZ',
      ordinal: 2,
    });
  });

  it('모르는 도시 id는 나라·조각에서 빼고 개수에는 센다', () => {
    expect(ids(earnedMilestones([v('xx-nowhere', '2025-01-01')]))).toEqual([]);
    const ten = [...pragues(9), v('xx-nowhere', '2025-01-01')];
    expect(ids(earnedMilestones(ten))).toEqual(['country:CZ', 'count:10']);
  });
});

describe('기념 문구', () => {
  it('종류마다 머리글·제목·설명', () => {
    expect(milestoneText({ id: 'country:CZ', kind: 'country', country: 'CZ', ordinal: 1 }, '프라하')).toEqual(
      {
        label: '새 나라',
        title: '체코 첫 도장',
        sub: '여권의 첫 나라예요',
      },
    );
    expect(milestoneText({ id: 'country:AT', kind: 'country', country: 'AT', ordinal: 3 }, '빈').sub).toBe(
      '3번째 나라예요',
    );
    expect(milestoneText({ id: 'count:25', kind: 'count', count: 25 }, '빈')).toEqual({
      label: '기념 도장',
      title: '25번째 도장',
      sub: '빈에서 찍었어요',
    });
    expect(milestoneText({ id: 'flag:LU', kind: 'flag', country: 'LU', pieces: 3 }, '비안덴').title).toBe(
      '룩셈부르크 국기 완성',
    );
  });
});
