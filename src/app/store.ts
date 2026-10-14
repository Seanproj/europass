import { create } from 'zustand';

/** 바텀시트 단계: peek(검색창 + 국기 줄) → half → full */
export type SheetSnap = 'peek' | 'half' | 'full';
export const SHEET_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

/** 지도에서 고른 도시 또는 나라 (시트에 상세 표시) */
export type Selection = { kind: 'city'; id: string } | { kind: 'country'; code: string };

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
  selection: Selection | null;
  select: (s: Selection | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toast: ToastState | null;
  showToast: (t: Omit<ToastState, 'id'>) => void;
  dismissToast: (id?: number) => void;
  stampFx: StampFx | null;
  playStamp: (fx: Omit<StampFx, 'nonce'>) => void;
  clearStamp: (nonce: number) => void;
  /** 지도가 날아갈 도시. reveal이면 도착한 뒤 안개 구멍이 열린다 */
  focus: { cityId: string; reveal: boolean; nonce: number } | null;
  focusCity: (cityId: string, reveal?: boolean) => void;
}

let seq = 0;

export const useUI = create<UIState>((set) => ({
  sheetSnap: 'peek',
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  selection: null,
  select: (selection) =>
    set((s) => ({ selection, sheetSnap: selection && s.sheetSnap === 'peek' ? 'half' : s.sheetSnap })),
  searchOpen: false,
  setSearchOpen: (searchOpen) => set(searchOpen ? { searchOpen, sheetSnap: 'full' } : { searchOpen }),
  toast: null,
  showToast: (t) => set({ toast: { ...t, id: ++seq } }),
  dismissToast: (id) => set((s) => (id === undefined || s.toast?.id === id ? { toast: null } : {})),
  stampFx: null,
  playStamp: (fx) => set({ stampFx: { ...fx, nonce: ++seq } }),
  clearStamp: (nonce) => set((s) => (s.stampFx?.nonce === nonce ? { stampFx: null } : {})),
  focus: null,
  focusCity: (cityId, reveal = false) => set({ focus: { cityId, reveal, nonce: ++seq } }),
}));
