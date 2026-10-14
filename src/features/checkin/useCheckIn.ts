import { useCallback } from 'react';
import { navigate } from '../../app/nav';
import { useUI } from '../../app/store';
import { getCity } from '../../data/cities';
import { db } from '../../db/db';
import { koreanDate } from '../../lib/date';
import { checkIn, undoCheckIn } from './checkin';
import { takeNewBadges, unseeBadges } from '../profile/badgeSync';

/**
 * 체크인 흐름: 저장 → 시트는 도시 상세 → 지도 이동(첫 방문은 도착 뒤 안개 열림) → 도장 "쾅" + 햅틱 → 되돌리기 토스트.
 * date를 주면 그 날짜로 소급 기록한다 (다시 방문 기록)
 */
export function useCheckIn() {
  return useCallback(async (cityId: string, date?: string) => {
    const city = getCity(cityId);
    if (!city) return;
    const result = await checkIn(db, cityId, date);
    const ui = useUI.getState();

    if (result.kind === 'duplicate') {
      navigate({ kind: 'city', id: cityId });
      ui.showToast({
        message: date ? `${koreanDate(date)}에 이미 기록했어요` : `오늘 이미 기록했어요 · ${city.name.ko}`,
      });
      return;
    }

    const { visit, nth, previous } = result;
    if (nth === 1) useUI.setState({ revealCity: cityId });
    navigate({ kind: 'city', id: cityId });
    ui.playStamp({
      cityId,
      visit: { id: visit.id, date: visit.date },
      previous: previous && { id: previous.id, date: previous.date },
    });
    navigator.vibrate?.(12);
    let badgeIds: string[] = [];
    let undone = false;
    ui.showToast({
      message: nth === 1 ? `${city.name.ko} 도장 획득` : `${city.name.ko} ${nth}번째 방문`,
      action: {
        label: '되돌리기',
        run: () => {
          undone = true;
          void undoCheckIn(db, visit.id).then(() => unseeBadges(db, badgeIds));
          // 이 체크인으로 줄 선 배지 토스트도 함께 거둔다
          useUI.setState((s) => ({ toastQueue: s.toastQueue.filter((t) => t.group !== visit.id) }));
          const s = useUI.getState();
          s.dismissToast();
          if (s.stampFx?.visit.id === visit.id) s.clearStamp(s.stampFx.nonce);
        },
      },
    });

    // 새 배지는 체크인 토스트가 사라진 다음 차례로
    const badges = await takeNewBadges(db).catch(() => []);
    badgeIds = badges.map((b) => b.id);
    // 배지를 세는 사이에 되돌렸으면 알리지 않고 "안 알림"으로 돌린다
    if (undone) return void unseeBadges(db, badgeIds);
    for (const b of badges) {
      useUI
        .getState()
        .showToast(
          { message: `배지 획득 · ${b.name}`, badge: { icon: b.icon }, group: visit.id },
          { queue: true },
        );
    }
  }, []);
}
