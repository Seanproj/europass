import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { greeting, replayOrder, shouldReplay, shouldShowIntro } from './start';

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

describe('시작 화면', () => {
  it('오프닝은 처음 쓰는 사람에게만', () => {
    expect(shouldShowIntro({ onboarded: false, hasVisits: false, hasProfile: false })).toBe(true);
    expect(shouldShowIntro({ onboarded: true, hasVisits: false, hasProfile: false })).toBe(false);
    // 기존 사용자(기록이나 프로필이 있음)는 건너뛴다
    expect(shouldShowIntro({ onboarded: false, hasVisits: true, hasProfile: false })).toBe(false);
    expect(shouldShowIntro({ onboarded: false, hasVisits: false, hasProfile: true })).toBe(false);
  });

  it('리플레이는 기록이 있고 그날 처음 열 때만', () => {
    expect(shouldReplay(undefined, '2026-10-15', true)).toBe(true);
    expect(shouldReplay('2026-10-14', '2026-10-15', true)).toBe(true);
    expect(shouldReplay('2026-10-15', '2026-10-15', true)).toBe(false);
    expect(shouldReplay(undefined, '2026-10-15', false)).toBe(false);
  });

  it('리플레이 순서는 처음 간 날짜순, 도시마다 한 번', () => {
    expect(
      replayOrder([
        v('cz-prague', '2026-03-08'),
        v('fr-paris', '2025-05-01'),
        v('cz-prague', '2024-01-01'),
        v('at-vienna', '2026-01-01'),
      ]),
    ).toEqual(['cz-prague', 'fr-paris', 'at-vienna']);
  });

  it('인사: 마지막 여행이 며칠 전인지 + 여권 점수', () => {
    expect(greeting([], '2026-10-15', 0)).toBeNull();
    expect(greeting([v('cz-prague', '2026-09-07')], '2026-10-15', 710)).toBe(
      '다시 오셨네요 · 마지막 여행 38일 전 · 여권 점수 710',
    );
    // 머문 기간이 있으면 떠난 날 기준
    expect(greeting([v('cz-prague', '2026-10-10', '2026-10-14')], '2026-10-15', 1240)).toBe(
      '다시 오셨네요 · 마지막 여행 어제 · 여권 점수 1,240',
    );
    expect(greeting([v('cz-prague', '2026-10-15')], '2026-10-15', 5)).toContain('마지막 여행 오늘');
    // 앞으로의 날짜가 섞여 있어도 음수가 되지 않는다
    expect(greeting([v('cz-prague', '2026-12-01')], '2026-10-15', 5)).toContain('마지막 여행 오늘');
  });
});
