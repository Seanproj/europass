import type { CloudStatus } from '../../cloud/controller';

/** "3분 전" */
export function ago(t: number | null, now = Date.now()): string {
  if (!t) return '아직 없음';
  const m = Math.round((now - t) / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

export const STATUS: Record<CloudStatus, string> = {
  off: '',
  signedOut: '꺼짐',
  idle: '켜짐',
  syncing: '맞추는 중…',
  offline: '오프라인 · 연결되면 맞춰요',
  error: '맞추지 못했어요',
};

/** 설정 목록에 보이는 한 줄 요약 */
export function cloudSummary(status: CloudStatus, lastSyncAt: number | null): string {
  return status === 'idle' ? `켜짐 · ${ago(lastSyncAt)}` : STATUS[status];
}
