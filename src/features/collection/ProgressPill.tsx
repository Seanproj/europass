import { MapPin } from 'lucide-react';
import styles from './ProgressPill.module.css';

interface Props {
  cities: number;
  countries: number;
}

export function ProgressPill({ cities, countries }: Props) {
  return (
    <div className={styles.pill} aria-label={`${cities}개 도시, ${countries}개국 방문`}>
      <MapPin className={styles.icon} aria-hidden />
      <span>
        <b>{cities}</b>개 도시
      </span>
      <i className={styles.dot} aria-hidden />
      <span>
        <b>{countries}</b>개국
      </span>
    </div>
  );
}
