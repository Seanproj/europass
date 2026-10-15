import { useCallback } from 'react';
import { navigate } from '../../app/nav';
import { useUI } from '../../app/store';
import { getCity } from '../../data/cities';
import { db } from '../../db/db';
import { koreanDate } from '../../lib/date';
import { checkIn, undoCheckIn } from './checkin';
import { takeNewBadges, unseeBadges } from '../profile/badgeSync';
import { prefetchCityTiles } from '../map/prefetch';
import { playStampSound } from './stampSound';
import { takeNewMilestones, unseeMilestones } from './milestoneSync';
import { reportWriteError } from '../../app/storageWatch';

/**
 * 체크인 흐름: 저장 → 시트는 도시 상세 → 지도 이동(첫 방문은 도착 뒤 안개 열림) → 도장 "쾅" + 햅틱 → 되돌리기 토스트.
 * date를 주면 그 날짜로 소급 기록한다 (다시 방문 기록). endDate는 머문 기간
 */
export function useCheckIn() {
  return useCallback(async (cityId: string, date?: string, endDate?: string) => {
    const city = getCity(cityId);
    if (!city) return;
    let result;
    try {
      result = await checkIn(db, cityId, date, endDate);
    } catch (err) {
      if (reportWriteError(err, '도장을')) return;
      throw err;
    }
    const ui = useUI.getState();

    if (result.kind === 'duplicate') {
      navigate({ kind: 'city', id: cityId });
      ui.showToast({
        message: date ? `${koreanDate(date)}에 이미 기록했어요` : `오늘 이미 기록했어요 · ${city.name.ko}`,
      });
      return;
    }

    const { visit, first, nth, previous, previousNth } = result;
    if (first) useUI.setState({ revealCity: cityId });
    // 검색에서 체크인하면 시트가 끝까지 펼쳐져 있어 지도의 안개 걷힘·도장 연출이 가려진다. 반쯤 내려 지도를 보이게
    if (useUI.getState().sheetSnap === 'full') useUI.setState({ sheetSnap: 'half', searchOpen: false });
    navigate({ kind: 'city', id: cityId });
    ui.playStamp({
      cityId,
      visit: { id: visit.id, date: visit.date },
      nth,
      previous: previous && { id: previous.id, date: previous.date, nth: previousNth },
    });
    navigator.vibrate?.(12);
    playStampSound();
    // 설정을 켰고 와이파이면 이 도시 둘레 지도를 오프라인용으로 받아 둔다
    void prefetchCityTiles(city.lat, city.lon);
    let badgeIds: string[] = [];
    let milestoneIds: string[] = [];
    let undone = false;
    // 기념 판정이 끝날 때까지 시간을 재지 않는다 (아래 finally에서 시작)
    const toastId = ui.showToast({
      paused: true,
      // 지난 날짜로 소급하면 첫 기록이 아니어도 날짜순 1번째일 수 있다
      message: first
        ? `${city.name.ko} 도장 획득`
        : nth === 1
          ? `${city.name.ko} 첫 방문 기록`
          : `${city.name.ko} ${nth}번째 방문`,
      action: {
        label: '되돌리기',
        run: () => {
          undone = true;
          void undoCheckIn(db, visit.id).then(() =>
            Promise.all([unseeBadges(db, badgeIds), unseeMilestones(db, milestoneIds)]),
          );
          // 이 체크인으로 줄 선 배지 토스트도 함께 거둔다
          useUI.setState((s) => ({ toastQueue: s.toastQueue.filter((t) => t.group !== visit.id) }));
          const s = useUI.getState();
          s.dismissToast();
          s.dismissCelebration(visit.id);
          if (s.stampFx?.visit.id === visit.id) s.clearStamp(s.stampFx.nonce);
        },
      },
    });

    try {
      await announce();
    } finally {
      useUI.getState().resumeToast(toastId);
    }

    async function announce() {
      // 특별한 순간(새 나라, N번째 도장, 국기 완성)은 도장 "쾅"이 끝난 뒤 큰 연출로
      const milestones = await takeNewMilestones(db, visit.id).catch(() => []);
      milestoneIds = milestones.map((m) => m.id);
      // 새 배지는 체크인 토스트가 사라진 다음 차례로
      const badges = await takeNewBadges(db).catch(() => []);
      badgeIds = badges.map((b) => b.id);
      // 세는 사이에 되돌렸으면 알리지 않고 "안 알림"으로 돌린다
      if (undone) {
        await unseeMilestones(db, milestoneIds);
        return void unseeBadges(db, badgeIds);
      }
      if (milestones.length)
        useUI.getState().celebrate({ cityId, visit: { id: visit.id, date: visit.date }, nth, milestones });
      for (const b of badges) {
        useUI
          .getState()
          .showToast(
            { message: `배지 획득 · ${b.name}`, badge: { icon: b.icon }, group: visit.id },
            { queue: true },
          );
      }
    }
  }, []);
}
