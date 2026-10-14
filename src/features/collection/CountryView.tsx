import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './CountryView.module.css';
import { navigate } from '../../app/nav';
import { Flag } from '../../components/Flag/Flag';
import { Stamp } from '../../components/Stamp/Stamp';
import { CITIES, getCity, getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import type { Visit } from '../../db/types';
import { PuzzleMinimap } from './PuzzleMinimap';
import type { CountryProgress } from './progress';

interface Props {
  code: string;
  progress: CountryProgress;
  byCity: Map<string, Visit[]>;
}

/** 국가 상세: 국기 퍼즐 미니맵 + 진행률 + 도시 그리드 (대표 도시 / 더 많은 도시 / 히든젬) */
export function CountryView({ code, progress, byCity }: Props) {
  const country = getCountry(code)!;
  const [region, setRegion] = useState<string | null>(null);
  const own = useMemo(() => CITIES.filter((c) => c.country === code), [code]);
  const painted = useMemo(
    () => new Set(own.filter((c) => byCity.has(c.id)).map((c) => c.regionId)),
    [own, byCity],
  );

  // 방문한 도시를 앞에, 나머지는 인구순 (cities.json이 이미 인구순)
  const ordered = useMemo(
    () => [...own].sort((a, b) => Number(byCity.has(b.id)) - Number(byCity.has(a.id))),
    [own, byCity],
  );
  const sections = [
    { title: '대표 도시', cities: ordered.filter((c) => c.tier === 1) },
    { title: '더 많은 도시', cities: ordered.filter((c) => c.tier !== 1 && !c.gem) },
    { title: '히든젬', cities: ordered.filter((c) => c.tier !== 1 && c.gem) },
  ].filter((s) => s.cities.length > 0);
  const regionCities = region ? ordered.filter((c) => c.regionId === region) : [];
  const regionName = region ? getCity(region)?.name.ko : '';

  return (
    <section className={styles.country} aria-label={`${country.name.ko} 상세`}>
      <div className={styles.head}>
        <Flag code={code} size={40} visited={progress.cities > 0} alt="" />
        <div>
          <h2 className={styles.title}>{country.name.ko}</h2>
          <p className={styles.meta}>
            {progress.painted} / {progress.pieces} 조각 · 도시 {progress.cities} / {progress.totalCities}곳
            {progress.complete && ' · 완성'}
          </p>
        </div>
      </div>
      <span className={styles.bar} aria-hidden>
        <span
          className={progress.complete ? styles.barDone : styles.barFill}
          style={{ width: `${progress.pieces ? (progress.painted / progress.pieces) * 100 : 0}%` }}
        />
      </span>

      <PuzzleMinimap code={code} painted={painted} selected={region} onPick={setRegion} />

      {region && (
        <div className={styles.region} aria-live="polite">
          <div className={styles.regionHead}>
            <h3 className={styles.sectionTitle}>{regionName} 지역</h3>
            <button
              type="button"
              className={styles.close}
              onClick={() => setRegion(null)}
              aria-label="지역 목록 닫기"
            >
              <X aria-hidden />
            </button>
          </div>
          <CityGrid cities={regionCities} byCity={byCity} />
        </div>
      )}

      {!region &&
        sections.map((s) => (
          <div key={s.title} className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {s.title} <span>{s.cities.length}</span>
            </h3>
            <CityGrid cities={s.cities} byCity={byCity} />
          </div>
        ))}
    </section>
  );
}

function CityGrid({ cities, byCity }: { cities: City[]; byCity: Map<string, Visit[]> }) {
  return (
    <ul className={styles.grid}>
      {cities.map((c) => {
        const visits = byCity.get(c.id);
        return (
          <li key={c.id}>
            <button
              type="button"
              className={styles.cell}
              onClick={() => navigate({ kind: 'city', id: c.id })}
              aria-label={`${c.name.ko}${visits ? ` (${visits.length}번 방문)` : ''}`}
            >
              <Stamp city={c} visit={visits?.[0] ?? null} nth={visits?.length} size={72} decorative />
              <span className={styles.cellName}>
                {c.name.ko}
                {visits && visits.length > 1 && <b> ×{visits.length}</b>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
