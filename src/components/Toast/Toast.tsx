import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Undo2 } from 'lucide-react';
import styles from './Toast.module.css';
import { useUI } from '../../app/store';

const DURATION_MS = 5000;

/**
 * 화면 아래 토스트 한 개 (5초). 체크인의 "되돌리기"처럼 확인 대신 되돌릴 기회를 준다.
 * 줄 선 토스트(새 배지)는 지금 것이 사라지면 차례로 나온다
 */
export function Toast() {
  const toast = useUI((s) => s.toast);
  const dismiss = useUI((s) => s.dismissToast);

  // 손가락·마우스·포커스가 토스트에 있는 동안은 시간을 멈춘다 (되돌리기를 누르려는 중에 사라지지 않게)
  const [held, setHeld] = useState(false);
  // 도장 "쾅"과 기념 연출이 화면에 있는 동안도 멈춘다 (연출을 보고 나서도 되돌릴 시간이 남게)
  const busy = useUI((s) => !!s.stampFx || !!s.pendingCelebration);
  const id = toast?.id;
  const paused = !toast || toast.paused || held || busy;
  useEffect(() => {
    if (id === undefined || paused) return;
    const t = setTimeout(() => dismiss(id), DURATION_MS);
    return () => clearTimeout(t);
  }, [id, paused, dismiss]);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={styles.toast}
            onPointerEnter={() => setHeld(true)}
            onPointerLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {toast.badge && (
              <span className={styles.badge} aria-hidden>
                <toast.badge.icon />
              </span>
            )}
            <span className={styles.message}>{toast.message}</span>
            {toast.action && (
              <button type="button" className={styles.action} onClick={toast.action.run}>
                {toast.action.icon ? <toast.action.icon aria-hidden /> : <Undo2 aria-hidden />}
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
