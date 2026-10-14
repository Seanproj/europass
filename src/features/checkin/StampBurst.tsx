import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import styles from './StampBurst.module.css';
import { useUI } from '../../app/store';
import { Stamp } from '../../components/Stamp/Stamp';
import { getCity } from '../../data/cities';

/** 도장이 화면에 머무는 시간 */
const HOLD_MS = 1100;

/**
 * 체크인 순간의 도장 "쾅": scale 1.6 → 1 (260ms 스프링).
 * 재방문이면 이전 도장 위에 새 도장이 겹쳐 찍힌다
 */
export function StampBurst() {
  const fx = useUI((s) => s.stampFx);
  const clear = useUI((s) => s.clearStamp);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => clear(fx.nonce), HOLD_MS);
    return () => clearTimeout(t);
  }, [fx, clear]);

  const city = fx ? getCity(fx.cityId) : undefined;
  return (
    <div className={styles.layer} aria-hidden="true">
      <AnimatePresence>
        {fx && city && (
          <motion.div
            key={fx.nonce}
            className={styles.stack}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            data-testid="stamp-burst"
          >
            {fx.previous && (
              <Stamp
                city={city}
                visit={fx.previous}
                nth={fx.previous.nth}
                size={168}
                className={styles.under}
              />
            )}
            <motion.div
              className={styles.stamp}
              initial={reduce ? { opacity: 0 } : { scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.26, bounce: 0.35 }}
            >
              <Stamp city={city} visit={fx.visit} nth={fx.nth} size={168} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
