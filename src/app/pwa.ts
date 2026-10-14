import { RefreshCw } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { useUI } from './store';

/**
 * 서비스 워커 등록 (배포 빌드에서만). 새 버전이 기다리고 있으면 조용한 토스트로 알리고,
 * "새로고침"을 누르면 새 버전으로 바꿔 다시 연다
 */
export function setupPWA() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh() {
      useUI.getState().showToast(
        {
          message: '새 버전이 있어요',
          action: { label: '새로고침', icon: RefreshCw, run: () => void update(true) },
        },
        { queue: true },
      );
    },
  });
}
