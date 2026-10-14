import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Undo2 } from 'lucide-react';
import styles from './Toast.module.css';
import { useUI } from '../../app/store';

const DURATION_MS = 5000;

/** 화면 아래 토스트 한 개 (5초). 체크인의 "되돌리기"처럼 확인 대신 되돌릴 기회를 준다 */
export function Toast() {
  const toast = useUI((s) => s.toast);
  const dismiss = useUI((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismiss(toast.id), DURATION_MS);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={styles.toast}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span className={styles.message}>{toast.message}</span>
            {toast.action && (
              <button type="button" className={styles.action} onClick={toast.action.run}>
                <Undo2 aria-hidden />
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
