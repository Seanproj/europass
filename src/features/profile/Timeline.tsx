import { navigate } from '../../app/nav';
import { Stamp } from '../../components/Stamp/Stamp';
import { getCity } from '../../data/cities';
import { dateRange } from '../../lib/date';
import { useBlobUrl } from '../collection/useBlobUrl';
import styles from './Timeline.module.css';
import type { TimelineEntry, TimelineMonth } from './stats';

const monthLabel = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;

/** 모든 방문을 월별로: 도장 썸네일 + 도시명(재방문이면 "· 3번째") + 메모 첫 줄 + 사진 1장 */
export function Timeline({ months }: { months: TimelineMonth[] }) {
  return (
    <section className={styles.section} aria-labelledby="timeline-title">
      <h2 id="timeline-title" className={styles.title}>
        타임라인
      </h2>
      {months.length === 0 ? (
        <p className={styles.empty}>첫 도장을 찍으면 여기에 쌓여요</p>
      ) : (
        months.map((m) => (
          <div key={m.month} className={styles.month}>
            <h3 className={styles.monthTitle}>{monthLabel(m.month)}</h3>
            <ul className={styles.list}>
              {m.entries.map((e) => (
                <Row key={e.visit.id} entry={e} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function Row({ entry: { visit, nth } }: { entry: TimelineEntry }) {
  const city = getCity(visit.cityId);
  const photo = useBlobUrl(visit.photos[0]);
  const note = visit.note.split('\n').find((l) => l.trim() !== '');
  const name = city?.name.ko ?? visit.cityId;
  return (
    <li>
      <button
        type="button"
        className={styles.row}
        onClick={() => city && navigate({ kind: 'city', id: city.id })}
        disabled={!city}
      >
        {city && <Stamp city={city} visit={visit} size={48} decorative className={styles.stamp} />}
        <span className={styles.text}>
          <span className={styles.name}>
            {name}
            {nth > 1 && <span className={styles.nth}> · {nth}번째</span>}
          </span>
          <span className={styles.date}>{dateRange(visit.date, visit.endDate)}</span>
          {note && <span className={styles.note}>{note}</span>}
        </span>
        {photo && <img className={styles.photo} src={photo} alt="" width={52} height={52} />}
      </button>
    </li>
  );
}
