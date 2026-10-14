import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { PAGE_H, PER_PAGE, STAMP_W, bookPages } from './passportBook';

let n = 0;
const visit = (cityId: string, date: string): Visit => ({
  id: `v${++n}`,
  cityId,
  date,
  note: '',
  photos: [],
  createdAt: n,
  updatedAt: n,
});

const CITIES = [
  'cz-prague',
  'fr-paris',
  'at-vienna',
  'be-brussels',
  'be-bruges',
  'at-salzburg',
  'no-tromso',
  'lu-luxembourg',
];

describe('여권 넘기기 페이지', () => {
  it('연도별로 오래된 해부터, 한 해가 많으면 여러 장', () => {
    const visits = [
      visit('cz-prague', '2026-03-01'),
      ...CITIES.map((c, i) => visit(c, `2025-0${(i % 9) + 1}-10`)),
      visit('xx-nowhere', '2025-01-01'),
    ];
    const pages = bookPages(visits);
    expect(pages.map((p) => [p.year, p.part, p.parts, p.stamps.length])).toEqual([
      [2025, 1, 2, PER_PAGE],
      [2025, 2, 2, CITIES.length - PER_PAGE],
      [2026, 1, 1, 1],
    ]);
    // 한 장 안에서는 날짜순
    const dates = pages[0]!.stamps.map((s) => s.visit.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('도장 자리는 페이지 안, 다시 계산해도 같은 자리', () => {
    const visits = CITIES.slice(0, 6).map((c, i) => visit(c, `2024-0${i + 1}-01`));
    const a = bookPages(visits);
    const b = bookPages([...visits].reverse());
    expect(a[0]!.stamps.map((s) => [s.x, s.y])).toEqual(b[0]!.stamps.map((s) => [s.x, s.y]));
    for (const s of a[0]!.stamps) {
      expect(s.x - STAMP_W / 2).toBeGreaterThanOrEqual(0);
      expect(s.x + STAMP_W / 2).toBeLessThanOrEqual(100);
      expect(s.y - STAMP_W / 2).toBeGreaterThanOrEqual(19);
      expect(s.y + STAMP_W / 2).toBeLessThanOrEqual(PAGE_H);
    }
  });

  it('재방문 순번은 전체 기록 기준', () => {
    const pages = bookPages([visit('cz-prague', '2023-05-01'), visit('cz-prague', '2024-05-01')]);
    expect(pages.map((p) => p.stamps[0]!.nth)).toEqual([1, 2]);
  });

  it('기록이 없으면 페이지도 없다', () => {
    expect(bookPages([])).toEqual([]);
  });
});
