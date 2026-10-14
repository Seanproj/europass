import { HardDrive } from 'lucide-react';
import { estimateStorage, isQuotaError, STORAGE_WARN_RATIO } from '../lib/storage';
import { navigate } from './nav';
import { useUI } from './store';

let warned = false;

/** 저장 공간이 90% 넘게 차면 한 번(세션당) 조용히 알린다. 앱 시작과 사진을 넣은 뒤에 부른다 */
export async function warnIfStorageFull(): Promise<void> {
  if (warned) return;
  const s = await estimateStorage();
  if (!s || s.ratio < STORAGE_WARN_RATIO) return;
  warned = true;
  useUI.getState().showToast(
    {
      message: '저장 공간이 거의 찼어요',
      action: { label: '확인', icon: HardDrive, run: () => navigate({ kind: 'profile' }) },
    },
    { queue: true },
  );
}

/** 쓰기에 실패했을 때: 용량 부족이면 안내하고 true */
export function reportWriteError(err: unknown, what: string): boolean {
  if (!isQuotaError(err)) return false;
  useUI.getState().showToast({ message: `저장 공간이 부족해 ${what} 저장하지 못했어요` });
  return true;
}

/** 테스트용 */
export function resetStorageWarning() {
  warned = false;
}
