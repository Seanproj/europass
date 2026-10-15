import { History, Share2, X } from 'lucide-react';
import { Stamp } from '../../components/Stamp/Stamp';
import { getCity } from '../../data/cities';
import { stayNights } from '../../db/selectors';
import { dotDate, stayLabel } from '../../lib/date';
import styles from './MemoryCard.module.css';
import { memoryTitle, type Memory } from './onThisDay';
import { useBlobUrl } from './useBlobUrl';

interface Props {
  memory: Memory;
  /** 이 도시의 몇 번째 방문인지 (도장 표식) */
  nth: number;
  onOpen: () => void;
  onShare: () => void;
  onDismiss: () => void;
}

/** 시트 홈 맨 위 회상 카드: "1년 전 오늘, 프라하에 있었어요" + 도장 + 사진 + 메모 */
export function MemoryCard({ memory, nth, onOpen, onShare, onDismiss }: Props) {
  const { visit } = memory;
  const city = getCity(visit.cityId);
  const photo = useBlobUrl(visit.photos[0]);
  if (!city) return null;
  const note = visit.note.split('\n').find((l) => l.trim() !== '');
  const nights = stayNights(visit);
  const title = memoryTitle(memory);
  return (
    <section className={styles.card} aria-label={`${title}의 기록`}>
      <button type="button" className={styles.main} onClick={onOpen}>
        <Stamp city={city} visit={visit} nth={nth} size={56} decorative className={styles.stamp} />
        <span className={styles.text}>
          <span className={styles.kicker}>
            <History aria-hidden />
            {title}
          </span>
          <b className={styles.headline}>{city.name.ko}에 있었어요</b>
          <span className={styles.date}>
            {dotDate(visit.date)}
            {nights > 0 && ` · ${stayLabel(nights)}`}
          </span>
          {note && <span className={styles.note}>{note}</span>}
        </span>
        {photo && <img className={styles.photo} src={photo} alt="" width={52} height={52} />}
      </button>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.icon}
          aria-label={`${city.name.ko} 카드 공유`}
          onClick={onShare}
        >
          <Share2 aria-hidden />
        </button>
        <button type="button" className={styles.icon} aria-label="오늘은 그만 보기" onClick={onDismiss}>
          <X aria-hidden />
        </button>
      </div>
    </section>
  );
}
