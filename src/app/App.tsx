import { MotionConfig } from 'motion/react';
import styles from './App.module.css';
import { MapPlaceholder } from '../features/map/MapPlaceholder';
import { ProgressPill } from '../features/collection/ProgressPill';
import { HomeSheet } from '../features/collection/HomeSheet';
import { ProfileButton } from '../features/profile/ProfileButton';
import { useStats } from '../lib/useStats';

export function App() {
  const stats = useStats();
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.app}>
        <MapPlaceholder />
        <header className={styles.top}>
          <ProgressPill cities={stats.cities} countries={stats.countries} />
          <ProfileButton />
        </header>
        <HomeSheet stats={stats} />
      </div>
    </MotionConfig>
  );
}
