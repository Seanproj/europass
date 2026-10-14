import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';
import type { Visit } from '../db/types';

/** 바텀시트 단계: peek(검색창 + 국기 줄) → half → full */
export type SheetSnap = 'peek' | 'half' | 'full';
export const SHEET_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

/** 시트 안의 화면: 홈 → 국가 상세 → 도시 상세. URL 쿼리와 브라우저 뒤로가기는 nav.ts가 맞춘다 */
export type Route =
  | { kind: 'home' }
  | { kind: 'country'; code: string }
  | { kind: 'city'; id: string }
  /** 전체 화면 프로필 페이지. 아래 시트는 홈 상태로 둔다 */
  | { kind: 'profile' }
  /** 연말 결산 "My Euro Year" (전체 화면) */
  | { kind: 'wrap'; year: number }
  /** 다른 사람의 공개 프로필 ?u=handle (읽기 전용: 지도 + 시트) */
  | { kind: 'public'; handle: string };
export const HOME: Route = { kind: 'home' };

export interface ToastState {
  id: number;
  message: string;
  /** 동작 버튼. 아이콘을 안 주면 되돌리기 화살표 */
  action?: { label: string; run: () => void; icon?: LucideIcon };
  /** 배지 획득 토스트는 아이콘을 앞에 단다 */
  badge?: { icon: LucideIcon };
  /** 함께 거둘 토스트 묶음 (체크인 하나에서 나온 배지 토스트들 = 방문 id) */
  group?: string;
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
  /** 다음 차례를 기다리는 토스트 (배지 토스트는 체크인 토스트 뒤에 줄 선다) */
  toastQueue: ToastState[];
  /** 지금 토스트를 바꾼다. queue면 지금 것이 사라진 뒤에 보여 준다 */
  showToast: (t: Omit<ToastState, 'id'>, opts?: { queue?: boolean }) => void;
  dismissToast: (id?: number) => void;
  stampFx: StampFx | null;
  playStamp: (fx: Omit<StampFx, 'nonce'>) => void;
  clearStamp: (nonce: number) => void;
  /** 다음에 도시 상세로 갈 때 지도가 도착한 뒤 안개 구멍을 열 도시 (첫 체크인 연출) */
  revealCity: string | null;
  /** 공개 프로필을 보는 동안 지도에 그릴 그 사람의 기록 (없으면 내 기록) */
  publicView: { visits: Visit[]; homeCityId: string } | null;
}

let seq = 0;

export const useUI = create<UIState>((set) => ({
  sheetSnap: 'peek',
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  route: HOME,
  searchOpen: false,
  setSearchOpen: (searchOpen) => set(searchOpen ? { searchOpen, sheetSnap: 'full' } : { searchOpen }),
  toast: null,
  toastQueue: [],
  showToast: (t, opts) =>
    set((s) => {
      const next = { ...t, id: ++seq };
      if (opts?.queue && s.toast) return { toastQueue: [...s.toastQueue, next] };
      return { toast: next };
    }),
  dismissToast: (id) =>
    set((s) => {
      if (id !== undefined && s.toast?.id !== id) return {};
      const [head = null, ...rest] = s.toastQueue;
      return { toast: head, toastQueue: rest };
    }),
  stampFx: null,
  playStamp: (fx) => set({ stampFx: { ...fx, nonce: ++seq } }),
  clearStamp: (nonce) => set((s) => (s.stampFx?.nonce === nonce ? { stampFx: null } : {})),
  revealCity: null,
  publicView: null,
}));
