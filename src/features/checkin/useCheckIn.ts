import { useCallback } from 'react';
import { useUI } from '../../app/store';
import { getCity } from '../../data/cities';
import { db } from '../../db/db';
import { checkIn, undoCheckIn } from './checkin';

/**
 * 체크인 흐름: 저장 → 시트는 도시 상세 → 지도 이동 + 안개 열림 → 도장 "쾅" + 햅틱 → 되돌리기 토스트
 */
export function useCheckIn() {
  return useCallback(async (cityId: string) => {
    const ui = useUI.getState();
    const city = getCity(cityId);
    if (!city) return;
    const result = await checkIn(db, cityId);

    ui.setSearchOpen(false);
    ui.select({ kind: 'city', id: cityId });
    ui.setSheetSnap('half');

    if (result.kind === 'duplicate') {
      ui.focusCity(cityId);
      ui.showToast({ message: `오늘 이미 기록했어요 · ${city.name.ko}` });
      return;
    }

    const { visit, nth, previous } = result;
    ui.focusCity(cityId, nth === 1);
    ui.playStamp({
      cityId,
      visit: { id: visit.id, date: visit.date },
      previous: previous && { id: previous.id, date: previous.date },
    });
    navigator.vibrate?.(12);
    ui.showToast({
      message: nth === 1 ? `${city.name.ko} 도장 획득` : `${city.name.ko} ${nth}번째 방문`,
      action: {
        label: '되돌리기',
        run: () => {
          void undoCheckIn(db, visit.id);
          const s = useUI.getState();
          s.dismissToast();
          if (s.stampFx?.visit.id === visit.id) s.clearStamp(s.stampFx.nonce);
        },
      },
    });
  }, []);
}
