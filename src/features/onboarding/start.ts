import type { Visit } from '../../db/types';

/** 여권 발급 오프닝은 처음 쓰는 사람에게 한 번만 (기록이나 프로필이 이미 있으면 기존 사용자) */
export function shouldShowIntro(s: { onboarded: boolean; hasVisits: boolean; hasProfile: boolean }): boolean {
  return !s.onboarded && !s.hasVisits && !s.hasProfile;
}

/** 안개 리플레이는 기록이 있고 그날 처음 열 때만 */
export function shouldReplay(lastOpened: string | undefined, today: string, hasVisits: boolean): boolean {
  return hasVisits && lastOpened !== today;
}

/** 리플레이로 안개를 열 도시 순서: 처음 간 날짜순, 같은 도시는 한 번 */
export function replayOrder(visits: Visit[]): string[] {
  const first = new Map<string, string>();
  for (const v of visits) {
    const d = first.get(v.cityId);
    if (d === undefined || v.date < d) first.set(v.cityId, v.date);
  }
  return [...first].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0])).map(([id]) => id);
}

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

/** 다시 연 날의 인사 한 줄: "다시 오셨네요 · 마지막 여행 38일 전 · 여권 점수 710" */
export function greeting(visits: Visit[], today: string, score: number): string | null {
  if (visits.length === 0) return null;
  // 머문 기간이 있으면 떠난 날 기준, 앞으로의 날짜(예약 기록)는 오늘로
  const last = visits.reduce((m, v) => {
    const end = v.endDate && v.endDate > v.date ? v.endDate : v.date;
    return end > m ? end : m;
  }, '');
  const ago = Math.max(0, daysBetween(last, today));
  const when =
    ago === 0
      ? '마지막 여행 오늘'
      : ago === 1
        ? '마지막 여행 어제'
        : `마지막 여행 ${ago.toLocaleString('ko-KR')}일 전`;
  return `다시 오셨네요 · ${when} · 여권 점수 ${score.toLocaleString('ko-KR')}`;
}
