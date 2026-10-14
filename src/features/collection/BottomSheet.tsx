import { animate, motion, useDragControls, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './BottomSheet.module.css';
import type { SheetSnap } from '../../app/store';
import { readSafeArea, useViewportHeight } from '../../lib/useViewportHeight';
import { nearestSnap, nextSnap, snapHeights } from './sheetMath';

interface Props {
  label: string;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** 손잡이 영역(드래그 가능) — 검색창 같은 상단 고정 내용 */
  header: ReactNode;
  children: ReactNode;
}

const SNAP_LABEL: Record<SheetSnap, string> = { peek: '접힘', half: '반쯤 펼침', full: '펼침' };

/**
 * 항상 떠 있는 비모달 바텀시트. 지도와 상단 버튼은 계속 조작할 수 있어야 하므로
 * 대화상자(포커스 트랩, aria-hidden)가 아닌 region으로 만든다.
 */
export function BottomSheet({ label, snap, onSnapChange, header, children }: Props) {
  const viewport = useViewportHeight();
  const [safe] = useState(readSafeArea);
  const heights = useMemo(() => snapHeights(viewport, safe.top, safe.bottom), [viewport, safe]);
  const full = heights.full;
  // y = 시트를 아래로 내린 거리. 0이면 full
  const y = useMotionValue(full - heights[snap]);
  const controls = useDragControls();
  const reduce = useReducedMotion();

  useEffect(() => {
    const target = full - heights[snap];
    const anim = animate(
      y,
      target,
      reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 42 },
    );
    return () => anim.stop();
  }, [snap, full, heights, y, reduce]);

  return (
    <motion.section
      className={styles.sheet}
      aria-label={label}
      style={{ height: full, y }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: full - heights.peek }}
      dragElastic={0.06}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const target = nearestSnap(heights, full - y.get(), info.velocity.y);
        if (target === snap) {
          animate(y, full - heights[target], { type: 'spring', stiffness: 420, damping: 42 });
        } else onSnapChange(target);
      }}
    >
      <div className={styles.grab} onPointerDown={(e) => controls.start(e)}>
        <button
          type="button"
          className={styles.handle}
          aria-label={`시트 크기 바꾸기 (지금: ${SNAP_LABEL[snap]})`}
          onClick={() => onSnapChange(nextSnap(snap))}
        >
          <span />
        </button>
        {header}
      </div>
      {/* half에서도 스크롤된다. 시트 아래쪽(화면 밖에 걸친 부분)만큼 여백을 더해 끝까지 닿게 */}
      <div
        className={styles.body}
        data-scroll={snap !== 'peek'}
        style={{ '--offscreen': `${full - heights[snap]}px` } as CSSProperties}
      >
        {children}
      </div>
    </motion.section>
  );
}
