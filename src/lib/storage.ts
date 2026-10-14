/** 기기 저장 공간 (IndexedDB 등) 관련 도우미 */

export interface StorageUsage {
  usage: number;
  quota: number;
  /** 사용 비율 0~1 */
  ratio: number;
}

/** 이 정도 넘게 차면 미리 알린다 */
export const STORAGE_WARN_RATIO = 0.9;

export async function estimateStorage(): Promise<StorageUsage | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.quota) return null;
    const usage = est.usage ?? 0;
    return { usage, quota: est.quota, ratio: usage / est.quota };
  } catch {
    return null;
  }
}

/** 저장 공간이 모자라 쓰기에 실패한 오류인지 (Dexie는 이름을 그대로 넘긴다) */
export function isQuotaError(err: unknown): boolean {
  const e = err as { name?: string; inner?: { name?: string } } | null;
  return e?.name === 'QuotaExceededError' || e?.inner?.name === 'QuotaExceededError';
}

/** 12.3MB, 1.2GB */
export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)}MB`;
  return `${(n / 1024 ** 3).toFixed(1)}GB`;
}
