import styles from './MapPlaceholder.module.css';

/** 지도가 뜨기 전(불러오는 중) 또는 WebGL이 없는 환경(테스트, 오래된 기기)에서 지도 대신 보이는 바탕 */
export function MapPlaceholder({ loading = false }: { loading?: boolean }) {
  return (
    <div
      className={styles.map}
      role="img"
      aria-busy={loading || undefined}
      aria-label={loading ? '유럽 지도 불러오는 중' : '유럽 지도 (이 기기에서는 지도를 그릴 수 없어요)'}
    />
  );
}
