import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Share2, X } from 'lucide-react';
import styles from './Celebration.module.css';
import { useUI, type Celebration as CelebrationState } from '../../app/store';
import { Flag } from '../../components/Flag/Flag';
import { getCity } from '../../data/cities';
import { ShareDialog, type ShareFormat } from '../share/ShareDialog';
import { makeMilestoneCard } from '../share/share';
import { useProfile } from '../profile/profile';
import { milestoneCountry, milestoneText } from './milestones';
import { playMilestoneSound } from './stampSound';

/** 꽃가루 조각: 각도·거리·색·모양은 순번으로 정해 그릴 때마다 같다 */
const CONFETTI = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.17;
  const dist = 92 + ((i * 37) % 64);
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist * 0.8,
    rotate: ((i * 53) % 180) - 90,
    tone: (['accent', 'gold', 'ink'] as const)[i % 3] ?? 'accent',
    round: i % 4 === 0,
    delay: (i % 5) * 0.02,
  };
});

/**
 * 특별한 순간의 큰 연출: 도장 "쾅"이 끝나면 지도 위쪽에 국기(또는 큰 숫자) 카드가 터져 나온다.
 * 시트·토스트(되돌리기)는 가리지 않는 위쪽 영역이고, 지도는 계속 만질 수 있다 (모달 아님).
 * "기념 카드"로 공유 카드를 만들 수 있다
 */
export function Celebration() {
  // 프로필·결산 페이지를 여는 동안은 가린다
  const c = useUI((s) => (s.route.kind === 'profile' || s.route.kind === 'wrap' ? null : s.celebration));
  const dismiss = useUI((s) => s.dismissCelebration);
  const [sharing, setSharing] = useState<CelebrationState | null>(null);
  const profile = useProfile();

  // 연출이 뜰 때 한 번 "딩-동-댕"
  const nonce = c?.nonce;
  useEffect(() => {
    if (nonce !== undefined) playMilestoneSound();
  }, [nonce]);

  // Esc로 닫기 (공유 시트가 열려 있으면 그쪽이 먼저)
  useEffect(() => {
    if (!c || sharing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c, sharing, dismiss]);

  const city = c ? getCity(c.cityId) : undefined;
  const main = c?.milestones[0];
  const text = main && city ? milestoneText(main, city.name.ko) : null;
  const also = c && city ? c.milestones.slice(1).map((m) => milestoneText(m, city.name.ko).title) : [];

  const formats: ShareFormat[] = sharing
    ? [
        {
          id: 'milestone',
          label: '기념 카드',
          aspect: 1080 / 1350,
          make: () => makeMilestoneCard(sharing.milestones, sharing, profile),
          fileName: `euro-passport-${sharing.milestones[0]?.id.replace(':', '-') ?? 'milestone'}.png`,
        },
      ]
    : [];

  return (
    <>
      <div className={styles.layer}>
        <AnimatePresence>
          {c && main && text && (
            <Card
              key={c.nonce}
              country={milestoneCountry(main)}
              count={main.kind === 'count' ? main.count : null}
              label={text.label}
              title={text.title}
              sub={[text.sub, ...also].join(' · ')}
              onShare={() => setSharing(c)}
              onClose={() => dismiss()}
            />
          )}
        </AnimatePresence>
      </div>
      {/* 화면 낭독기에 한 번 알린다 (카드보다 먼저 있어야 바뀐 내용을 읽어 준다) */}
      <div className={styles.live} aria-live="polite">
        {text ? `${text.label}. ${text.title}. ${text.sub}` : ''}
      </div>
      <ShareDialog
        open={!!sharing}
        title="기념 카드 공유"
        formats={formats}
        onClose={() => setSharing(null)}
      />
    </>
  );
}

interface CardProps {
  country: string | null;
  count: number | null;
  label: string;
  title: string;
  sub: string;
  onShare: () => void;
  onClose: () => void;
}

function Card({ country, count, label, title, sub, onShare, onClose }: CardProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  return (
    <motion.section
      className={styles.card}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-testid="celebration"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={reduce ? { duration: 0.2 } : { type: 'spring', duration: 0.5, bounce: 0.4 }}
    >
      <div className={styles.hero} aria-hidden="true">
        {!reduce && (
          <>
            <motion.span
              className={styles.ring}
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {CONFETTI.map((p, i) => (
              <motion.span
                key={i}
                className={`${styles.bit} ${styles[p.tone]} ${p.round ? styles.round : ''}`}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 1, rotate: 0 }}
                animate={{ x: p.x, y: [0, p.y, p.y + 40], scale: 1, opacity: [1, 1, 0], rotate: p.rotate }}
                transition={{ duration: 1.3, delay: 0.08 + p.delay, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
        {country ? (
          <span className={styles.flag}>
            <Flag code={country} size={72} visited alt="" />
          </span>
        ) : (
          <span className={styles.count}>{count}</span>
        )}
      </div>
      <p className={styles.label}>{label}</p>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p className={styles.sub}>{sub}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.share} onClick={onShare}>
          <Share2 aria-hidden="true" />
          기념 카드
        </button>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <X aria-hidden="true" />
        </button>
      </div>
    </motion.section>
  );
}
