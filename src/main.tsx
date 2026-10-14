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

openStorage().then(
  () => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    // v0에서 쓰던 기록이 있으면 1회 옮긴다. 화면은 useLiveQuery로 자동 갱신.
    // 옮겨 오거나 지난번에 이미 얻은 배지는 알리지 않도록 표시해 둔다 (체크인으로 새로 얻을 때만 알림)
    migrateFromV0(db)
      .catch((err) => console.error('[migrate-v0]', err))
      .then(() => markBadgesSeen(db))
      .catch((err) => console.error('[badges]', err))
      .then(() => warnIfStorageFull());
  },
  (err: unknown) => {
    console.error('[storage]', err);
    root.render(<StorageError quota={isQuotaError(err)} />);
  },
);
