import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import styles from './Badges.module.css';
import { Dialog } from './Dialog';
import type { BadgeState } from './badges';

/** 원형 배경 + lucide 아이콘. 미획득은 흑백 */
export function BadgeIcon({ state, size = 56 }: { state: BadgeState; size?: number }) {
  const Icon = state.badge.icon;
  return (
    <span
      className={styles.icon}
      data-earned={state.earned}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon style={{ width: size * 0.44, height: size * 0.44 }} />
    </span>
  );
}

const progressText = (s: BadgeState) => (s.earned ? '획득' : `${s.value}/${s.badge.goal}`);

/** 프로필의 배지 한 줄 (가로 스크롤) + "모두 보기" 그리드 시트 */
export function Badges({ states }: { states: BadgeState[] }) {
  const [all, setAll] = useState(false);
  const earned = states.filter((s) => s.earned).length;
  // 얻은 것 먼저, 그다음 목표에 가까운 순
  const row = [...states].sort(
    (a, b) => Number(b.earned) - Number(a.earned) || b.value / b.badge.goal - a.value / a.badge.goal,
  );

  return (
    <section className={styles.section} aria-labelledby="badges-title">
      <div className={styles.head}>
        <h2 id="badges-title" className={styles.title}>
          배지{' '}
          <span className={styles.count}>
            {earned}/{states.length}
          </span>
        </h2>
        <button type="button" className={styles.more} onClick={() => setAll(true)}>
          모두 보기
          <ChevronRight aria-hidden />
        </button>
      </div>
      <ul className={styles.row}>
        {row.map((s) => (
          <li key={s.badge.id} className={styles.cell}>
            <BadgeIcon state={s} />
            <span className={styles.name}>{s.badge.name}</span>
            <span className={styles.sub}>{progressText(s)}</span>
          </li>
        ))}
      </ul>
      <Dialog open={all} title={`배지 ${earned}/${states.length}`} onClose={() => setAll(false)}>
        <ul className={styles.grid}>
          {states.map((s) => (
            <li key={s.badge.id} className={styles.card} data-earned={s.earned}>
              <BadgeIcon state={s} size={48} />
              <span className={styles.name}>{s.badge.name}</span>
              <span className={styles.desc}>{s.badge.desc}</span>
              {!s.earned && (
                <span className={styles.bar} aria-label={`진행 ${s.value}/${s.badge.goal}`}>
                  <span style={{ width: `${(s.value / s.badge.goal) * 100}%` }} />
                </span>
              )}
              <span className={styles.sub}>{progressText(s)}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </section>
  );
}
