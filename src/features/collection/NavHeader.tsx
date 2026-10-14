import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from './NavHeader.module.css';
import { goBack } from '../../app/nav';

/** 상세 화면의 시트 좌상단: 뒤로 화살표 + 지금 화면 이름 (+ 오른쪽 끝 동작 버튼 하나) */
export function NavHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className={styles.header}>
      <button type="button" className={styles.back} onClick={goBack} aria-label="뒤로">
        <ChevronLeft aria-hidden />
      </button>
      <span className={styles.title}>{title}</span>
      {action}
    </div>
  );
}

/** NavHeader 오른쪽 끝 아이콘 버튼 */
export function NavAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={styles.action} onClick={onClick} aria-label={label}>
      {icon}
    </button>
  );
}
