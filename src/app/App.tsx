import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import styles from './App.module.css';
import { MapPlaceholder } from '../features/map/MapPlaceholder';
import { ProgressPill } from '../features/collection/ProgressPill';
import { HomeSheet } from '../features/collection/HomeSheet';
import { ProfileButton } from '../features/profile/ProfileButton';
import { useStats } from '../lib/useStats';
import { useNavSync } from './nav';
import { useUI } from './store';
import { Toast } from '../components/Toast/Toast';
import { StampBurst } from '../features/checkin/StampBurst';
import { Celebration } from '../features/checkin/Celebration';

// 지도(MapLibre 약 1MB)는 따로 불러와 시트와 알약이 먼저 뜨게 한다
const MapView = lazy(() => import('../features/map/MapView').then((m) => ({ default: m.MapView })));
// 프로필 페이지는 열 때 불러온다
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const PublicSheet = lazy(() =>
  import('../features/cloud/PublicSheet').then((m) => ({ default: m.PublicSheet })),
);
const WrapPage = lazy(() => import('../features/share/WrapPage').then((m) => ({ default: m.WrapPage })));

export function App() {
  const stats = useStats();
  useNavSync();
  const route = useUI((s) => s.route);
  const profileOpen = route.kind === 'profile';
  const pageOpen = profileOpen || route.kind === 'wrap';
  const sheetFull = useUI((s) => s.sheetSnap === 'full');
  const mapStarted = useMapStart();
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.app}>
        {/* 프로필·결산 페이지가 덮고 있는 동안 아래 화면은 포커스·스크린리더에서 뺀다 */}
        <div className={styles.layer} inert={pageOpen}>
          {/* 시트를 끝까지 펼치면 지도를 덮으므로 뒤쪽은 포커스에서 뺀다 (시트 안 포커스 트랩) */}
          <div className={styles.layer} inert={sheetFull}>
            {mapStarted ? (
              <Suspense fallback={<MapPlaceholder loading />}>
                <MapView />
              </Suspense>
            ) : (
              <MapPlaceholder loading />
            )}
            {/* 공개 프로필을 볼 때는 그 사람의 기록이라 내 진행률·프로필 버튼을 숨긴다 */}
            {route.kind !== 'public' && (
              <header className={styles.top}>
                <ProgressPill cities={stats.cities} countries={stats.countries} />
                <ProfileButton />
              </header>
            )}
          </div>
          {route.kind === 'public' ? (
            <Suspense fallback={null}>
              <PublicSheet key={route.handle} handle={route.handle} />
            </Suspense>
          ) : (
            <HomeSheet />
          )}
        </div>
        <Suspense fallback={null}>
          <AnimatePresence>
            {profileOpen && <ProfilePage key="profile" />}
            {route.kind === 'wrap' && <WrapPage key="wrap" year={route.year} />}
          </AnimatePresence>
        </Suspense>
        <StampBurst />
        <Celebration />
        <Toast />
      </div>
    </MotionConfig>
  );
}

/**
 * 지도(MapLibre + 안개)는 무거워서, 시트와 알약이 먼저 그려지고 브라우저가 한숨 돌린 뒤에 불러온다
 * (첫 화면이 빨리 뜨고, 그사이 손가락 입력이 막히지 않게). 늦어도 1.5초 안에는 시작
 */
function useMapStart(): boolean {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const start = () => setStarted(true);
    // 첫 그림이 화면에 나간 다음 프레임 이후
    let idle = 0;
    const raf = requestAnimationFrame(() => {
      idle =
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(start, { timeout: 1500 })
          : window.setTimeout(start, 200);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      clearTimeout(idle);
    };
  }, []);
  return started;
}
