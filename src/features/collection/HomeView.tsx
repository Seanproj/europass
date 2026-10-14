import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import styles from './HomeView.module.css';
import { navigate } from '../../app/nav';
import { Flag } from '../../components/Flag/Flag';
import { Stamp } from '../../components/Stamp/Stamp';
import { getCity, getCountry } from '../../data/cities';
import type { Visit } from '../../db/types';
import { dotDate } from '../../lib/date';
import { europePercent, type CountryProgress } from './progress';

interface Props {
  countries: CountryProgress[];
  /** 도시별 방문 목록 (최신순) */
  byCity: Map<string, Visit[]>;
  /** 기록이 없을 때 고스트 도장으로 보여줄 홈 도시 */
  homeId?: string;
  onSearch: () => void;
}

type Tab = 'countries' | 'cities';

/** 시트 홈: 요약 + [나라 | 도시] 세그먼트 하나 */
export function HomeView({ countries, byCity, homeId, onSearch }: Props) {
  const [tab, setTab] = useState<Tab>('countries');
  const visitedCountries = countries.filter((c) => c.cities > 0).length;
  const cityCount = byCity.size;

  return (
    <section className={styles.home}>
      <h2 className={styles.title}>나의 유럽</h2>
      <p className={styles.meta}>
        {visitedCountries}개국 · {cityCount}개 도시 · 유럽의 {europePercent(cityCount)}%
      </p>

      {cityCount === 0 && <FirstStamp homeId={homeId} onSearch={onSearch} />}

      <div className={styles.segment} role="tablist" aria-label="목록">
        {(['countries', 'cities'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`home-tab-${t}`}
            aria-controls="home-panel"
            aria-selected={tab === t}
            className={styles.seg}
            onClick={() => setTab(t)}
          >
            {t === 'countries' ? '나라' : '도시'}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="home-panel" aria-labelledby={`home-tab-${tab}`}>
        {tab === 'countries' ? <CountryList countries={countries} /> : <CityList byCity={byCity} />}
      </div>
    </section>
  );
}

/** 기록이 없을 때: 홈 도시의 빈 도장 자리 + 첫 도장 안내 */
function FirstStamp({ homeId, onSearch }: Pick<Props, 'homeId' | 'onSearch'>) {
  const home = getCity(homeId ?? '') ?? getCity('de-frankfurt');
  return (
    <div className={styles.first}>
      {home && <Stamp city={home} size={92} decorative />}
      <div className={styles.firstText}>
        <p className={styles.firstTitle}>첫 도장을 찍어보세요</p>
        <p className={styles.firstBody}>
          다녀온 도시를 고르면 바로 도장이 찍히고, 모을수록 지도의 안개가 걷혀요.
        </p>
        <button type="button" className={styles.firstButton} onClick={onSearch}>
          <Search aria-hidden />
          도시 찾기
        </button>
      </div>
    </div>
  );
}

function CountryList({ countries }: { countries: CountryProgress[] }) {
  return (
    <ul className={styles.list} aria-label="나라">
      {countries.map((p) => {
        const name = getCountry(p.code)?.name.ko ?? p.code;
        const visited = p.cities > 0;
        return (
          <li key={p.code}>
            <button
              type="button"
              className={styles.row}
              onClick={() => navigate({ kind: 'country', code: p.code })}
            >
              <Flag code={p.code} size={34} visited={visited} alt="" />
              <span className={styles.body}>
                <span className={styles.line}>
                  <span className={styles.name}>{name}</span>
                  <span className={styles.count}>
                    {visited
                      ? `${p.painted} / ${p.pieces} 조각 · ${p.cities}개 도시`
                      : `${p.pieces}조각 · ${p.totalCities}개 도시`}
                  </span>
                </span>
                <span className={styles.bar} aria-hidden>
                  <span
                    className={p.complete ? styles.barDone : styles.barFill}
                    style={{ width: `${p.pieces ? (p.painted / p.pieces) * 100 : 0}%` }}
                  />
                </span>
              </span>
              <ChevronRight className={styles.chev} aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** 방문한 도시를 최근 방문순으로 */
function CityList({ byCity }: { byCity: Map<string, Visit[]> }) {
  const rows = [...byCity]
    .map(([id, visits]) => ({ city: getCity(id), visits }))
    .filter(
      (r): r is { city: NonNullable<typeof r.city>; visits: Visit[] } => !!r.city && r.visits.length > 0,
    )
    .sort((a, b) => b.visits[0]!.date.localeCompare(a.visits[0]!.date));
  if (rows.length === 0)
    return <p className={styles.empty}>아직 도장이 없어요. 다녀온 도시를 검색해서 첫 도장을 찍어보세요.</p>;
  return (
    <ul className={styles.list} aria-label="도시">
      {rows.map(({ city, visits }) => (
        <li key={city.id}>
          <button
            type="button"
            className={styles.row}
            onClick={() => navigate({ kind: 'city', id: city.id })}
          >
            <Stamp city={city} visit={visits[0]} nth={visits.length} size={44} decorative />
            <span className={styles.body}>
              <span className={styles.name}>{city.name.ko}</span>
              <span className={styles.sub}>
                {getCountry(city.country)?.name.ko} · {dotDate(visits[0]!.date)}
              </span>
            </span>
            {visits.length > 1 && <span className={styles.times}>×{visits.length}</span>}
            <ChevronRight className={styles.chev} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
