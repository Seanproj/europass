import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './app/App';
import { db } from './db/db';
import { migrateFromV0 } from './db/migrate-v0';
import { markBadgesSeen } from './features/profile/badgeSync';
import { applyTheme, loadTheme } from './features/profile/theme';

applyTheme(loadTheme());

// v0에서 쓰던 기록이 있으면 1회 옮긴다. 화면은 useLiveQuery로 자동 갱신.
// 옮겨 오거나 지난번에 이미 얻은 배지는 알리지 않도록 표시해 둔다 (체크인으로 새로 얻을 때만 알림)
migrateFromV0(db)
  .catch((err) => console.error('[migrate-v0]', err))
  .then(() => markBadgesSeen(db))
  .catch((err) => console.error('[badges]', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
