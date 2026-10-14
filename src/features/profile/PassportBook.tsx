import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navigate } from '../../app/nav';
import { Stamp } from '../../components/Stamp/Stamp';
import { koreanDate } from '../../lib/date';
import styles from './PassportBook.module.css';
import { PAGE_H, STAMP_W, type BookPage } from './passportBook';

/** 스와이프로 넘기는 거리 (px) */
const SWIPE = 60;

/** 여권 넘기기: 연도별 페이지에 그해 도장이 흩어져 찍혀 있다. 처음엔 가장 최근 페이지 */
export function PassportBook({ pages }: { pages: BookPage[] }) {
  const [index, setIndex] = useState(pages.length - 1);
  const [dir, setDir] = useState(0);
  const reduce = useReducedMotion();
  // 기록이 바뀌어 페이지 수가 줄면 마지막 장으로
  const i = Math.min(Math.max(index, 0), pages.length - 1);
  const page = pages[i];
  if (!page) return null;

  const go = (to: number) => {
    if (to < 0 || to >= pages.length || to === i) return;
    setDir(to > i ? 1 : -1);
    setIndex(to);
  };
  const title = `${page.year}년${page.parts > 1 ? ` (${page.part}/${page.parts})` : ''}`;

  return (
    <div className={styles.book}>
      <div
        className={styles.viewport}
        role="group"
        aria-roledescription="여권 페이지"
        aria-label={`${title}, 도장 ${page.stamps.length}개. 좌우 화살표로 넘기기`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(i - 1);
          if (e.key === 'ArrowRight') go(i + 1);
        }}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={`${page.year}-${page.part}`}
            className={styles.page}
            style={{ aspectRatio: `100 / ${PAGE_H}` }}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { x: `${dir * 100}%`, rotateY: dir * -12, opacity: 0.4 }}
            animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: `${dir * -100}%`, rotateY: dir * 12, opacity: 0.4 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.12 }}
            drag={pages.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE) go(i + 1);
              else if (info.offset.x > SWIPE) go(i - 1);
            }}
            data-testid="passport-page"
          >
            <span className={styles.head} aria-hidden>
              <b>{page.year}</b>
              {page.parts > 1 && (
                <small>
                  {page.part}/{page.parts}
                </small>
              )}
            </span>
            {page.stamps.map((s) => (
              <button
                key={s.visit.id}
                type="button"
                className={styles.stamp}
                style={{
                  left: `${s.x}%`,
                  top: `${(s.y / PAGE_H) * 100}%`,
                  width: `${STAMP_W}%`,
                }}
                aria-label={`${s.city.name.ko}, ${koreanDate(s.visit.date)}${s.nth > 1 ? `, ${s.nth}번째 방문` : ''}`}
                onClick={() => navigate({ kind: 'city', id: s.city.id })}
              >
                <Stamp
                  city={s.city}
                  visit={{ id: s.visit.id, date: s.visit.date }}
                  nth={s.nth}
                  size={128}
                  decorative
                />
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      {pages.length > 1 && (
        <div className={styles.nav}>
          <button type="button" aria-label="이전 페이지" disabled={i === 0} onClick={() => go(i - 1)}>
            <ChevronLeft aria-hidden />
          </button>
          <span className={styles.count} aria-live="polite">
            {title} · {i + 1} / {pages.length}
          </span>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={i === pages.length - 1}
            onClick={() => go(i + 1)}
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
