import { Minus, Plus } from 'lucide-react';
import { addDays, koreanDate, stayLabel } from '../../lib/date';
import styles from './StayStepper.module.css';

/** 머문 기간을 늘려 잡을 수 있는 최대 박수 */
export const MAX_NIGHTS = 365;

interface Props {
  /** 도착한 날 (YYYY-MM-DD) */
  date: string;
  nights: number;
  onChange: (nights: number) => void;
}

/** 머문 기간: −/+로 박수를 고르면 떠난 날을 계산해 보여준다 ("2박 3일 · 2014년 1월 17일까지") */
export function StayStepper({ date, nights, onChange }: Props) {
  return (
    <div className={styles.stay} role="group" aria-label="머문 기간">
      <button
        type="button"
        className={styles.step}
        aria-label="하루 줄이기"
        disabled={nights <= 0}
        onClick={() => onChange(nights - 1)}
      >
        <Minus aria-hidden />
      </button>
      <span className={styles.value} aria-live="polite">
        <b>{stayLabel(nights)}</b>
        <small>{nights === 0 ? '하루만 머묾' : `${koreanDate(addDays(date, nights))}까지`}</small>
      </span>
      <button
        type="button"
        className={styles.step}
        aria-label="하루 늘리기"
        disabled={nights >= MAX_NIGHTS}
        onClick={() => onChange(nights + 1)}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}
