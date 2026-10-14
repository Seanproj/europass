import styles from './MapPlaceholder.module.css';

/** WebGL이 없는 환경(테스트, 오래된 기기)에서 지도 대신 보이는 바탕 */
export function MapPlaceholder() {
  return (
    <div className={styles.map} role="img" aria-label="유럽 지도 (이 기기에서는 지도를 그릴 수 없어요)" />
  );
}
