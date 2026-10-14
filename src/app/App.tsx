import { lazy, Suspense } from 'react';
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

// 지도(MapLibre 약 1MB)는 따로 불러와 시트와 알약이 먼저 뜨게 한다
const MapView = lazy(() => import('../features/map/MapView').then((m) => ({ default: m.MapView })));
// 프로필 페이지는 열 때 불러온다
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const WrapPage = lazy(() => import('../features/share/WrapPage').then((m) => ({ default: m.WrapPage })));

export function App() {
  const stats = useStats();
  useNavSync();
  const route = useUI((s) => s.route);
  const profileOpen = route.kind === 'profile';
  const pageOpen = profileOpen || route.kind === 'wrap';
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.app}>
        {/* 프로필·결산 페이지가 덮고 있는 동안 아래 화면은 포커스·스크린리더에서 뺀다 */}
        <div className={styles.layer} inert={pageOpen}>
          <Suspense fallback={<MapPlaceholder />}>
            <MapView />
          </Suspense>
          <header className={styles.top}>
            <ProgressPill cities={stats.cities} countries={stats.countries} />
            <ProfileButton />
          </header>
          <HomeSheet />
        </div>
        <Suspense fallback={null}>
          <AnimatePresence>
            {profileOpen && <ProfilePage key="profile" />}
            {route.kind === 'wrap' && <WrapPage key="wrap" year={route.year} />}
          </AnimatePresence>
        </Suspense>
        <StampBurst />
        <Toast />
      </div>
    </MotionConfig>
  );
}
