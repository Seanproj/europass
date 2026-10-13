import { create } from 'zustand';

/** 바텀시트 단계: peek(검색창 + 국기 줄) → half → full */
export type SheetSnap = 'peek' | 'half' | 'full';
export const SHEET_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

interface UIState {
  sheetSnap: SheetSnap;
  setSheetSnap: (snap: SheetSnap) => void;
}

export const useUI = create<UIState>((set) => ({
  sheetSnap: 'peek',
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
}));
