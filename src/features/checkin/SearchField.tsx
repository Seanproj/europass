import { LocateFixed, Search } from 'lucide-react';
import styles from './SearchField.module.css';

interface Props {
  onOpen: () => void;
}

/** 체크인 검색 진입점. 실제 검색은 Phase 4에서 구현 — 지금은 탭하면 시트를 펼친다 */
export function SearchField({ onOpen }: Props) {
  return (
    <div className={styles.field}>
      <button type="button" className={styles.trigger} onClick={onOpen}>
        <Search className={styles.icon} aria-hidden />
        <span>어디 다녀오셨어요?</span>
      </button>
      <button type="button" className={styles.locate} aria-label="현재 위치로 찾기" onClick={onOpen}>
        <LocateFixed aria-hidden />
      </button>
    </div>
  );
}
