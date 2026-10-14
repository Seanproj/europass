import { create } from 'zustand';

/** 바텀시트 단계: peek(검색창 + 국기 줄) → half → full */
export type SheetSnap = 'peek' | 'half' | 'full';
export const SHEET_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

/** 시트 안의 화면: 홈 → 국가 상세 → 도시 상세. URL 쿼리와 브라우저 뒤로가기는 nav.ts가 맞춘다 */
export type Route = { kind: 'home' } | { kind: 'country'; code: string } | { kind: 'city'; id: string };
export const HOME: Route = { kind: 'home' };

export interface ToastState {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

/** 체크인 순간 화면 가운데에 찍히는 도장 */
export interface StampFx {
  nonce: number;
  cityId: string;
  visit: { id: string; date: string };
  /** 재방문이면 그 아래 깔리는 이전 도장 */
  previous?: { id: string; date: string };
}

interface UIState {
  sheetSnap: SheetSnap;
  setSheetSnap: (snap: SheetSnap) => void;
  route: Route;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toast: ToastState | null;
  showToast: (t: Omit<ToastState, 'id'>) => void;
  dismissToast: (id?: number) => void;
  stampFx: StampFx | null;
  playStamp: (fx: Omit<StampFx, 'nonce'>) => void;
  clearStamp: (nonce: number) => void;
  /** 다음에 도시 상세로 갈 때 지도가 도착한 뒤 안개 구멍을 열 도시 (첫 체크인 연출) */
  revealCity: string | null;
}

let seq = 0;

export const useUI = create<UIState>((set) => ({
  sheetSnap: 'peek',
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  route: HOME,
  searchOpen: false,
  setSearchOpen: (searchOpen) => set(searchOpen ? { searchOpen, sheetSnap: 'full' } : { searchOpen }),
  toast: null,
  showToast: (t) => set({ toast: { ...t, id: ++seq } }),
  dismissToast: (id) => set((s) => (id === undefined || s.toast?.id === id ? { toast: null } : {})),
  stampFx: null,
  playStamp: (fx) => set({ stampFx: { ...fx, nonce: ++seq } }),
  clearStamp: (nonce) => set((s) => (s.stampFx?.nonce === nonce ? { stampFx: null } : {})),
  revealCity: null,
}));
