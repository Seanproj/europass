import type { Visit } from '../../db/types';
import { addDays } from '../../lib/date';

/** 오늘 앞뒤 며칠까지 "이맘때"로 볼지 */
export const MEMORY_WINDOW = 3;

export interface Memory {
  visit: Visit;
  /** 몇 년 전인지 (1 이상) */
  years: number;
  /** 오늘이 그날(머문 기간 포함)과 정확히 같은 날인지 */
  exact: boolean;
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000;
};

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** 그 해의 같은 월·일. 2월 29일은 평년이면 2월 28일 */
export function anniversary(iso: string, year: number): string {
  const md = iso.slice(5);
  if (md === '02-29' && !isLeap(year)) return `${year}-02-28`;
  return `${year}${iso.slice(4)}`;
}

/**
 * 1년 이상 전, 오늘 앞뒤 MEMORY_WINDOW일 안에 있었던 방문 하나.
 * 해가 바뀌는 때(12월 말 ↔ 1월 초)도 센다. 여럿이면 날짜가 가까운 것 → 최근 해 → 사진 있는 것 순
 */
export function memoryFor(visits: Visit[], today: string): Memory | null {
  const ty = Number(today.slice(0, 4));
  const t = dayNumber(today);
  let best: { m: Memory; offset: number } | null = null;
  for (const visit of visits) {
    const vy = Number(visit.date.slice(0, 4));
    const stay = visit.endDate ? dayNumber(visit.endDate) - dayNumber(visit.date) : 0;
    for (const y of [ty - 1, ty, ty + 1]) {
      const years = y - vy;
      if (years < 1) continue;
      const start = dayNumber(anniversary(visit.date, y));
      const end = dayNumber(addDays(anniversary(visit.date, y), stay));
      const offset = t >= start && t <= end ? 0 : Math.min(Math.abs(t - start), Math.abs(t - end));
      if (offset > MEMORY_WINDOW) continue;
      const m: Memory = { visit, years, exact: offset === 0 };
      const better =
        !best ||
        offset < best.offset ||
        (offset === best.offset &&
          (years < best.m.years ||
            (years === best.m.years && visit.photos.length > 0 && best.m.visit.photos.length === 0)));
      if (better) best = { m, offset };
    }
  }
  return best?.m ?? null;
}

/** 카드 제목: "1년 전 오늘" / "2년 전 이맘때" */
export function memoryTitle(m: Memory): string {
  return `${m.years}년 전 ${m.exact ? '오늘' : '이맘때'}`;
}
