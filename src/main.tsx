import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './app/App';
import { db } from './db/db';
import { migrateFromV0 } from './db/migrate-v0';

// v0에서 쓰던 기록이 있으면 1회 옮긴다. 화면은 useLiveQuery로 자동 갱신
migrateFromV0(db).catch((err) => console.error('[migrate-v0]', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
