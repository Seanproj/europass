import { lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import styles from './App.module.css';
import { MapPlaceholder } from '../features/map/MapPlaceholder';
import { ProgressPill } from '../features/collection/ProgressPill';
import { HomeSheet } from '../features/collection/HomeSheet';
import { ProfileButton } from '../features/profile/ProfileButton';
import { useStats } from '../lib/useStats';
import { useNavSync } from './nav';
import { Toast } from '../components/Toast/Toast';
import { StampBurst } from '../features/checkin/StampBurst';

// 지도(MapLibre 약 1MB)는 따로 불러와 시트와 알약이 먼저 뜨게 한다
const MapView = lazy(() => import('../features/map/MapView').then((m) => ({ default: m.MapView })));

export function App() {
  const stats = useStats();
  useNavSync();
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.app}>
        <Suspense fallback={<MapPlaceholder />}>
          <MapView />
        </Suspense>
        <header className={styles.top}>
          <ProgressPill cities={stats.cities} countries={stats.countries} />
          <ProfileButton />
        </header>
        <HomeSheet />
        <StampBurst />
        <Toast />
      </div>
    </MotionConfig>
  );
}
