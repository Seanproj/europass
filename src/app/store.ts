import { create } from 'zustand';

/** 바텀시트 단계: peek(검색창 + 국기 줄) → half → full */
export type SheetSnap = 'peek' | 'half' | 'full';
export const SHEET_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

/** 지도에서 고른 도시 또는 나라 (시트에 상세 표시) */
export type Selection = { kind: 'city'; id: string } | { kind: 'country'; code: string };

interface UIState {
  sheetSnap: SheetSnap;
  setSheetSnap: (snap: SheetSnap) => void;
  selection: Selection | null;
  select: (s: Selection | null) => void;
}

export const useUI = create<UIState>((set) => ({
  sheetSnap: 'peek',
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  selection: null,
  select: (selection) =>
    set((s) => ({ selection, sheetSnap: selection && s.sheetSnap === 'peek' ? 'half' : s.sheetSnap })),
}));
