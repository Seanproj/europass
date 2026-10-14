import { liveQuery } from 'dexie';
import { create } from 'zustand';
import { db } from '../db/db';
import { loadBackend, type CloudBackend, type CloudUser } from './backend';
import { cloudEnabled } from './config';
import { forgetSync, pendingCount, readSyncState, syncOnce } from './sync';

export type CloudStatus = 'off' | 'signedOut' | 'idle' | 'syncing' | 'offline' | 'error';

interface CloudState {
  status: CloudStatus;
  user: CloudUser | null;
  lastSyncAt: number | null;
  /** 아직 올리지 않은 변경 수 */
  pending: number;
  error: string | null;
}

export const useCloud = create<CloudState>(() => ({
  status: cloudEnabled ? 'signedOut' : 'off',
  user: null,
  lastSyncAt: null,
  pending: 0,
  error: null,
}));

let started = false;
let running: Promise<void> | null = null;
let again = false;
let timer = 0;

/** 지금 맞추기. 이미 맞추는 중이면 끝난 뒤 한 번 더 */
export async function syncNow(): Promise<void> {
  const { user } = useCloud.getState();
  const backend = await loadBackend();
  if (!backend || !user) return;
  if (running) {
    again = true;
    return running;
  }
  if (!navigator.onLine) {
    useCloud.setState({ status: 'offline' });
    return;
  }
  useCloud.setState({ status: 'syncing', error: null });
  running = (async () => {
    try {
      await syncOnce(db, backend.remote(user));
      useCloud.setState({ status: 'idle', lastSyncAt: Date.now() });
    } catch (err) {
      console.error('[sync]', err);
      useCloud.setState({
        status: navigator.onLine ? 'error' : 'offline',
        error: String((err as Error).message ?? err),
      });
    } finally {
      running = null;
    }
    if (again) {
      again = false;
      await syncNow();
    }
  })();
  return running;
}

/** 변경이 생기면 잠깐 모았다가 맞춘다 */
function scheduleSync(delay = 2000) {
  clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), delay);
}

async function setUser(user: CloudUser | null) {
  const prev = useCloud.getState().user;
  if (user?.id === prev?.id) return;
  if (!user) {
    await forgetSync(db);
    useCloud.setState({ user: null, status: 'signedOut', lastSyncAt: null });
    return;
  }
  const state = await readSyncState(db);
  useCloud.setState({
    user,
    status: 'idle',
    lastSyncAt: state?.userId === user.id ? state.lastSyncAt : null,
  });
  // 첫 로그인이면 이 기기 기록을 올린다 (syncOnce가 처리)
  void syncNow();
}

/** 앱 시작 때 한 번. 키가 없으면 아무것도 안 한다 */
export async function startCloud(): Promise<CloudBackend | null> {
  const backend = await loadBackend();
  if (!backend || started) return backend ?? null;
  started = true;
  backend.onAuthChange((u) => void setUser(u));
  await setUser(await backend.getUser());

  // 올리지 않은 변경을 지켜보다가 맞춘다 (오프라인이면 남겨 두었다가 온라인이 되면)
  liveQuery(() => pendingCount(db)).subscribe((pending) => {
    useCloud.setState({ pending });
    if (pending > 0 && useCloud.getState().user) scheduleSync();
  });
  window.addEventListener('online', () => void syncNow());
  window.addEventListener(
    'offline',
    () => useCloud.getState().user && useCloud.setState({ status: 'offline' }),
  );
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(500);
  });
  return backend;
}
