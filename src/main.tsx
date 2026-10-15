import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './app/App';
import { db } from './db/db';
import { migrateFromV0 } from './db/migrate-v0';
import { markBadgesSeen } from './features/profile/badgeSync';
import { applyTheme, loadTheme } from './features/profile/theme';
import { setupPWA } from './app/pwa';
import { StorageError } from './app/StorageError';
import { warnIfStorageFull } from './app/storageWatch';
import { isQuotaError } from './lib/storage';
import { cloudEnabled } from './cloud/config';
import { isAuthRedirect } from './cloud/backend';
import { useUI } from './app/store';
import { memoryFor } from './features/collection/onThisDay';
import { todayISO } from './lib/date';

applyTheme(loadTheme());
setupPWA();

const root = createRoot(document.getElementById('root')!);

/** 저장소(IndexedDB)를 먼저 연다. 시크릿 모드 등으로 못 열면 안내 화면 */
async function openStorage() {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB 없음');
  await Promise.race([
    db.open(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('저장소 응답 없음')), 10_000)),
  ]);
}

/** 클라우드 동기화(키가 있을 때만). 로그인하고 돌아온 주소면 화면을 그리기 전에 로그인을 마친다 */
/**
 * 시작할 때 시트를 반쯤 열어 보여줄 것이 있으면 연다: 기록이 없으면 첫 도장 안내, 1년 전 오늘 기록이 있으면 회상 카드.
 * v0 기록을 옮긴 뒤에 한 번만 확인한다 (옮기는 중에 빈 것으로 잘못 보지 않게)
 */
async function openSheetOnStart() {
  const visits = await db.visits.toArray();
  const today = todayISO();
  const dismissed = (await db.settings.get('memoryDismissed'))?.value === today;
  if (visits.length > 0 && (dismissed || !memoryFor(visits, today))) return;
  const ui = useUI.getState();
  if (ui.route.kind === 'home' && ui.sheetSnap === 'peek') ui.setSheetSnap('half');
}

async function startCloudIfEnabled(beforeRender: boolean) {
  if (!cloudEnabled || isAuthRedirect() !== beforeRender) return;
  const { startCloud } = await import('./cloud/controller');
  await startCloud().catch((err) => console.error('[cloud]', err));
}

openStorage().then(
  async () => {
    await startCloudIfEnabled(true);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    // v0에서 쓰던 기록이 있으면 1회 옮긴다. 화면은 useLiveQuery로 자동 갱신.
    // 옮겨 오거나 지난번에 이미 얻은 배지는 알리지 않도록 표시해 둔다 (체크인으로 새로 얻을 때만 알림)
    migrateFromV0(db)
      .catch((err) => console.error('[migrate-v0]', err))
      .then(() => openSheetOnStart())
      .then(() => markBadgesSeen(db))
      .catch((err) => console.error('[badges]', err))
      .then(() => warnIfStorageFull())
      .then(() => startCloudIfEnabled(false));
  },
  (err: unknown) => {
    console.error('[storage]', err);
    root.render(<StorageError quota={isQuotaError(err)} />);
  },
);
