import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { navigate } from '../../app/nav';
import { Stamp } from '../../components/Stamp/Stamp';
import styles from './Passport.module.css';
import type { Passport as PassportData, PassportTally } from './passport';

/** 처음에 보이는 도장 수 (3줄) */
const PREVIEW = 9;
const fmt = new Intl.NumberFormat('ko-KR');

/** 프로필의 "내 여권": 모은 도장 현황 + 도시마다 도장 하나 (첫 방문순) */
export function Passport({ data }: { data: PassportData }) {
  const [open, setOpen] = useState(false);
  const { stamps } = data;
  const shown = open ? stamps : stamps.slice(0, PREVIEW);
  return (
    <section className={styles.section} aria-labelledby="passport-title">
      <h2 id="passport-title" className={styles.title}>
        내 여권
      </h2>
      <dl className={styles.tally}>
        <Tally label="도장" t={data.all} />
        <Tally label="금색 도장" t={data.gold} gold />
        <Tally label="수도" t={data.capitals} />
      </dl>
      {stamps.length === 0 ? (
        <p className={styles.empty}>첫 도장을 찍으면 여권에 모여요</p>
      ) : (
        <>
          <ul className={styles.grid} aria-label="모은 도장">
            {shown.map((s) => (
              <li key={s.city.id}>
                <button
                  type="button"
                  className={styles.cell}
                  onClick={() => navigate({ kind: 'city', id: s.city.id })}
                >
                  <Stamp city={s.city} visit={s.latest} nth={s.count} size={88} decorative />
                  <span className={styles.name}>{s.city.name.ko}</span>
                </button>
              </li>
            ))}
          </ul>
          {stamps.length > PREVIEW && (
            <button
              type="button"
              className={styles.more}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? '접기' : `모두 보기 (${fmt.format(stamps.length)})`}
              {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Tally({ label, t, gold }: { label: string; t: PassportTally; gold?: boolean }) {
  return (
    <div className={styles.item} data-gold={gold || undefined}>
      <dt>{label}</dt>
      <dd>
        {fmt.format(t.got)}
        <small> / {fmt.format(t.total)}</small>
      </dd>
    </div>
  );
}
