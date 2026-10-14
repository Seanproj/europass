import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Camera, RefreshCw } from 'lucide-react';
import styles from './Postcard.module.css';
import { Stamp } from '../../components/Stamp/Stamp';
import type { City } from '../../data/types';
import { stayNights } from '../../db/selectors';
import type { Visit } from '../../db/types';
import { dateRange } from '../../lib/date';
import { useBlobUrl } from './useBlobUrl';

/** 방문 수만큼 겹쳐 쌓은 도장 (최신이 맨 위, 아래 것은 옅게). 최대 5장 */
export function StampStack({ city, visits }: { city: City; visits: Visit[] }) {
  const shown = visits.slice(0, 5);
  return (
    <span className={styles.stack}>
      {shown.length === 0 && <Stamp city={city} size={132} />}
      {[...shown].reverse().map((v, i, arr) => {
        const depth = arr.length - 1 - i;
        return (
          <Stamp
            key={v.id}
            city={city}
            visit={v}
            nth={visits.length - depth}
            size={132}
            decorative
            className={styles.layer}
            style={{
              opacity: depth === 0 ? 1 : Math.max(0.08, 0.26 - depth * 0.06),
              transform:
                depth === 0
                  ? undefined
                  : `translate(${(depth % 2 ? -1 : 1) * (10 + depth * 6)}px, ${depth * 5}px)`,
            }}
          />
        );
      })}
    </span>
  );
}

const stay = (nights: number) => (nights === 0 ? '당일' : `${nights}박 ${nights + 1}일`);

/**
 * 도시 상세 맨 위: 도장 스택을 누르면 카드처럼 뒤집혀 가장 최근 방문의 엽서가 된다.
 * 엽서 = 왼쪽 사진 + 오른쪽 위 우표 같은 도장 + "프라하에서" · 기간 · 한 줄 메모
 */
export function PostcardFlip({ city, visits }: { city: City; visits: Visit[] }) {
  const [back, setBack] = useState(false);
  const reduce = useReducedMotion();
  const latest = visits[0];
  if (!latest)
    return (
      <div className={styles.frame}>
        <StampStack city={city} visits={visits} />
      </div>
    );

  const front = (
    <span className={styles.front}>
      <StampStack city={city} visits={visits} />
      <span className={styles.hint} aria-hidden>
        <RefreshCw />
        엽서
      </span>
    </span>
  );
  const backFace = <PostcardBack city={city} visit={latest} nth={visits.length} />;

  return (
    <button
      type="button"
      className={styles.frame}
      aria-pressed={back}
      aria-label={back ? `${city.name.ko} 엽서, 눌러서 도장 보기` : `${city.name.ko} 도장, 눌러서 엽서 보기`}
      onClick={() => setBack((b) => !b)}
    >
      {reduce ? (
        // 움직임 줄이기: 돌리지 않고 바로 바꾼다
        back ? (
          backFace
        ) : (
          front
        )
      ) : (
        <motion.span
          className={styles.card}
          initial={false}
          animate={{ rotateY: back ? 180 : 0 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.18 }}
        >
          <span className={styles.face}>{front}</span>
          <span className={`${styles.face} ${styles.flipped}`}>{backFace}</span>
        </motion.span>
      )}
    </button>
  );
}

function PostcardBack({ city, visit, nth }: { city: City; visit: Visit; nth: number }) {
  const photo = useBlobUrl(visit.photos[0]);
  const note = visit.note.split('\n').find((l) => l.trim() !== '');
  return (
    <span className={styles.postcard} data-testid="postcard">
      <span className={styles.photo}>
        {photo ? (
          <img src={photo} alt="" />
        ) : (
          <span className={styles.noPhoto}>
            <Camera aria-hidden />
            사진을 넣으면
            <br />
            엽서 앞면이 돼요
          </span>
        )}
      </span>
      <span className={styles.text}>
        <Stamp city={city} visit={visit} nth={nth} size={52} decorative className={styles.postage} />
        <b className={styles.from}>{city.name.ko}에서</b>
        <span className={styles.when}>
          {dateRange(visit.date, visit.endDate)} · {stay(stayNights(visit))}
        </span>
        <span className={note ? styles.note : styles.empty}>
          {note ?? '아래 방문 기록을 눌러 한 줄을 남겨 보세요'}
        </span>
      </span>
    </span>
  );
}
