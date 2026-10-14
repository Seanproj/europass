import { ChevronLeft } from 'lucide-react';
import styles from './NavHeader.module.css';
import { goBack } from '../../app/nav';

/** 상세 화면의 시트 좌상단: 뒤로 화살표 + 지금 화면 이름 */
export function NavHeader({ title }: { title: string }) {
  return (
    <div className={styles.header}>
      <button type="button" className={styles.back} onClick={goBack} aria-label="뒤로">
        <ChevronLeft aria-hidden />
      </button>
      <span className={styles.title}>{title}</span>
    </div>
  );
}
