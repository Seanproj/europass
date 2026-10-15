import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { SCORE_RULES, TOTAL_PIECES, flagPieces, passportScore, travelDays } from './score';

let n = 0;
const v = (cityId: string, date: string, endDate?: string): Visit => ({
  id: `v${++n}`,
  cityId,
  date,
  ...(endDate ? { endDate } : {}),
  note: '',
  photos: [],
  createdAt: n,
  updatedAt: n,
});

describe('유럽에서 보낸 날', () => {
  it('당일은 1일, N박이면 N+1일', () => {
    expect(travelDays([v('cz-prague', '2025-05-01')])).toBe(1);
    expect(travelDays([v('cz-prague', '2025-05-01', '2025-05-04')])).toBe(4);
  });

  it('겹치는 날은 한 번만 (같은 여행에서 두 도시)', () => {
    expect(
      travelDays([v('cz-prague', '2025-05-01', '2025-05-03'), v('cz-brno', '2025-05-03', '2025-05-05')]),
    ).toBe(5);
    expect(travelDays([v('cz-prague', '2025-05-01'), v('cz-brno', '2025-05-01')])).toBe(1);
  });

  it('달·해를 넘어가도 달력대로, 잘못 넣은 긴 기간은 90일까지만', () => {
    expect(travelDays([v('at-vienna', '2025-12-30', '2026-01-02')])).toBe(4);
    expect(travelDays([v('at-vienna', '2020-01-01', '2025-01-01')])).toBe(90);
    // 떠난 날이 도착보다 앞이면 당일로
    expect(travelDays([v('at-vienna', '2025-05-05', '2025-05-01')])).toBe(1);
  });
});

describe('국기 조각', () => {
  it('칠한 조각 / 전체, 완성한 국기 수', () => {
    const p = flagPieces([
      v('lu-luxembourg', '2025-01-01'),
      v('lu-echternach', '2025-01-02'),
      v('lu-vianden', '2025-01-03'),
      v('cz-prague', '2025-02-01'),
    ]);
    expect(p).toEqual({ painted: 4, total: TOTAL_PIECES, complete: 1 });
    expect(TOTAL_PIECES).toBeGreaterThan(200);
  });
});

describe('여권 점수', () => {
  it('규칙: 도시 10 · 숨은 명소 +10 · 나라 50 · 국기 완성 100 · 보낸 날 5 · 재방문 5', () => {
    expect(SCORE_RULES.map((r) => [r.id, r.points])).toEqual([
      ['city', 10],
      ['gem', 10],
      ['country', 50],
      ['flag', 100],
      ['day', 5],
      ['revisit', 5],
    ]);
  });

  it('기록이 없으면 0점', () => {
    expect(passportScore([]).total).toBe(0);
  });

  it('항목마다 개수 × 점수, 합계는 항목 합', () => {
    // 룩셈부르크 3조각 완성 + 프라하 2번(2박 3일, 당일)
    const s = passportScore([
      v('cz-prague', '2025-05-01', '2025-05-03'),
      v('cz-prague', '2026-01-10'),
      v('lu-luxembourg', '2025-07-01'),
      v('lu-echternach', '2025-07-02'),
      v('lu-vianden', '2025-07-03'),
    ]);
    const line = (id: string) => s.lines.find((l) => l.id === id)!;
    expect(line('city')).toMatchObject({ count: 4, subtotal: 40 });
    expect(line('country')).toMatchObject({ count: 2, subtotal: 100 });
    expect(line('flag')).toMatchObject({ count: 1, subtotal: 100 });
    expect(line('day')).toMatchObject({ count: 3 + 1 + 3, subtotal: 35 });
    expect(line('revisit')).toMatchObject({ count: 1, subtotal: 5 });
    expect(line('gem').subtotal).toBe(line('gem').count * 10);
    expect(s.total).toBe(s.lines.reduce((a, l) => a + l.subtotal, 0));
    expect(s.days).toBe(7);
  });

  it('숨은 명소는 도시마다 한 번만 보너스', () => {
    const once = passportScore([v('lu-vianden', '2025-07-03')]);
    const twice = passportScore([v('lu-vianden', '2025-07-03'), v('lu-vianden', '2025-08-03')]);
    expect(once.lines.find((l) => l.id === 'gem')!.count).toBe(1);
    expect(twice.lines.find((l) => l.id === 'gem')!.count).toBe(1);
    // 두 번째는 재방문 5 + 보낸 날 5
    expect(twice.total - once.total).toBe(10);
  });

  it('모르는 도시 id는 어떤 점수에도 넣지 않는다', () => {
    expect(passportScore([v('xx-nowhere', '2025-01-01')]).total).toBe(0);
  });
});
