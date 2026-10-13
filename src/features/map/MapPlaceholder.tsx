import styles from './MapPlaceholder.module.css';

/** Phase 3에서 MapLibre 안개 지도로 교체될 자리 */
export function MapPlaceholder() {
  return <div className={styles.map} role="img" aria-label="유럽 지도 (준비 중)" />;
}
