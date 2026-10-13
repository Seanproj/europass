import { User } from 'lucide-react';
import styles from './ProfileButton.module.css';

/** 프로필 페이지는 Phase 6에서 연결 */
export function ProfileButton() {
  return (
    <button type="button" className={styles.button} aria-label="프로필">
      <User aria-hidden />
    </button>
  );
}
