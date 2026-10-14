const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** 기기 시간대 기준 오늘 YYYY-MM-DD */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "2026-10-13" → "13 OCT 2026" (도장) */
export function stampDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** "2026-10-13" → "2026년 10월 13일" */
export function koreanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 도장 좌표: 50.0755 → "50.0755° N" */
export function formatLat(lat: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
}

export function formatLon(lon: number): string {
  return `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

/** "2025-12-20" → "2025.12.20" */
export function dotDate(iso: string): string {
  return iso.replaceAll('-', '.');
}

/** "2025.04" (칩용 연월) */
export function dotMonth(iso: string): string {
  return iso.slice(0, 7).replace('-', '.');
}

/** 방문 기간: "2025.12.20 – 12.23", 해가 바뀌면 "2025.12.30 – 2026.01.02", 당일이면 날짜만 */
export function dateRange(start: string, end?: string): string {
  if (!end || end === start) return dotDate(start);
  return `${dotDate(start)} – ${end.slice(0, 4) === start.slice(0, 4) ? dotDate(end).slice(5) : dotDate(end)}`;
}

/** "2014-01-15" + 2 → "2014-01-17" (달력 기준, 시간대 영향 없음) */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) + days * 86_400_000);
  return t.toISOString().slice(0, 10);
}

/** 입력 중인 날짜가 저장해도 되는 값인지: 완전한 YYYY-MM-DD, 1950년 이후, max 이하 */
export function isCompleteDate(value: string, max?: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (Number(value.slice(0, 4)) < 1950) return false;
  if (addDays(value, 0) !== value) return false; // 2월 30일 같은 없는 날
  return !max || value <= max;
}

/** 머문 기간: 0 → "당일", 2 → "2박 3일" */
export function stayLabel(nights: number): string {
  return nights === 0 ? '당일' : `${nights}박 ${nights + 1}일`;
}
