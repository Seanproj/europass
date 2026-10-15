import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { anniversary, memoryFor, memoryTitle } from './onThisDay';

let n = 0;
const visit = (cityId: string, date: string, extra: Partial<Visit> = {}): Visit => ({
  id: `v${++n}`,
  cityId,
  date,
  note: '',
  photos: [],
  createdAt: n,
  updatedAt: n,
  ...extra,
});

describe('1년 전 오늘', () => {
  it('정확히 1년 전 같은 날 → "1년 전 오늘"', () => {
    const m = memoryFor([visit('cz-prague', '2025-10-15')], '2026-10-15')!;
    expect(m).toMatchObject({ years: 1, exact: true });
    expect(memoryTitle(m)).toBe('1년 전 오늘');
  });

  it('앞뒤 3일까지는 "이맘때", 4일부터는 없음', () => {
    expect(memoryTitle(memoryFor([visit('cz-prague', '2025-10-12')], '2026-10-15')!)).toBe('1년 전 이맘때');
    expect(memoryFor([visit('cz-prague', '2025-10-18')], '2026-10-15')).not.toBeNull();
    expect(memoryFor([visit('cz-prague', '2025-10-11')], '2026-10-15')).toBeNull();
    expect(memoryFor([visit('cz-prague', '2025-10-19')], '2026-10-15')).toBeNull();
  });

  it('올해 기록은 회상이 아니다', () => {
    expect(memoryFor([visit('cz-prague', '2026-10-14')], '2026-10-15')).toBeNull();
  });

  it('머문 기간 안이면 "오늘" (2박 3일 중 가운데 날)', () => {
    const m = memoryFor([visit('cz-prague', '2025-10-14', { endDate: '2025-10-16' })], '2026-10-15')!;
    expect(m.exact).toBe(true);
  });

  it('해가 바뀌는 때: 12월 30일 방문 ↔ 다음다음 해 1월 1일', () => {
    const m = memoryFor([visit('fr-paris', '2024-12-30')], '2026-01-01')!;
    expect(m).toMatchObject({ years: 1, exact: false });
    const back = memoryFor([visit('fr-paris', '2025-01-02')], '2026-12-31')!;
    expect(back).toMatchObject({ years: 2, exact: false });
  });

  it('윤년 2월 29일은 평년 2월 28일에 "오늘"', () => {
    expect(anniversary('2024-02-29', 2025)).toBe('2025-02-28');
    expect(anniversary('2024-02-29', 2028)).toBe('2028-02-29');
    expect(memoryFor([visit('at-vienna', '2024-02-29')], '2025-02-28')).toMatchObject({ exact: true });
  });

  it('여럿이면 날짜가 가까운 것 → 최근 해 → 사진 있는 것', () => {
    const far = visit('fr-paris', '2025-10-13');
    const near = visit('cz-prague', '2023-10-15');
    expect(memoryFor([far, near], '2026-10-15')!.visit).toBe(near);
    const old = visit('at-vienna', '2022-10-15');
    const recent = visit('be-bruges', '2024-10-15');
    expect(memoryFor([old, recent], '2026-10-15')!.visit).toBe(recent);
    const plain = visit('lu-luxembourg', '2025-10-15');
    const withPhoto = visit('no-tromso', '2025-10-15', { photos: [new Blob(['x'])] });
    expect(memoryFor([plain, withPhoto], '2026-10-15')!.visit).toBe(withPhoto);
  });
});
