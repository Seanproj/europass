import { useMemo } from 'react';
import { Check, LocateFixed, Loader2 } from 'lucide-react';
import styles from './SearchPanel.module.css';
import { Flag } from '../../components/Flag/Flag';
import { CITIES, COUNTRIES, getCity, getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import { buildIndex, cityNear, nearestCities, searchCities } from './search';
import type { GeoState } from './useGeolocation';

const INDEX = buildIndex(CITIES, COUNTRIES);
/** 나라 이름으로 찾으면 도시가 많아서 넉넉히 */
const LIMIT = 60;

interface Props {
  query: string;
  visits: Map<string, number>;
  homeId: string | undefined;
  geo: GeoState;
  onLocate: () => void;
  onPick: (cityId: string) => void;
}

/** 검색 결과, 또는 검색어가 없을 때 현재 위치 · 홈 근처 추천 */
export function SearchPanel({ query, visits, homeId, geo, onLocate, onPick }: Props) {
  const results = useMemo(() => searchCities(INDEX, query, LIMIT), [query]);

  if (query.trim()) {
    // 도시 이름이 맞은 것 먼저, 그다음 나라 이름으로 찾은 도시를 나라별로 묶어서
    const direct = results.filter((h) => !h.country);
    const groups = new Map<string, City[]>();
    for (const h of results)
      if (h.country) (groups.get(h.country) ?? groups.set(h.country, []).get(h.country)!).push(h.city);
    const row = (city: City) => (
      <CityRow key={city.id} city={city} visits={visits.get(city.id) ?? 0} onPick={onPick} />
    );
    return results.length ? (
      <ul className={styles.list} aria-label="검색 결과">
        {direct.map((h) => row(h.city))}
        {[...groups].map(([code, cities]) => [
          <li key={`group-${code}`} className={styles.group}>
            <Flag code={code} size={16} visited alt="" />
            {getCountry(code)?.name.ko ?? code}의 도시 · 큰 도시부터
          </li>,
          ...cities.map(row),
        ])}
      </ul>
    ) : (
      <p className={styles.empty}>"{query.trim()}"에 맞는 도시가 없어요</p>
    );
  }

  return (
    <>
      <NearMe geo={geo} onLocate={onLocate} visits={visits} onPick={onPick} />
      <Recommendations homeId={homeId} visits={visits} onPick={onPick} />
    </>
  );
}

function NearMe({ geo, onLocate, visits, onPick }: Pick<Props, 'geo' | 'onLocate' | 'visits' | 'onPick'>) {
  if (geo.status === 'hidden') return null;
  if (geo.status === 'found') {
    const near = cityNear(CITIES, geo.lat, geo.lon);
    if (!near) return <p className={styles.note}>30km 안에 등록된 도시가 없어요</p>;
    return (
      <section className={styles.section}>
        <h3 className={styles.heading}>지금 있는 곳</h3>
        <ul className={styles.list}>
          <CityRow
            city={near.city}
            visits={visits.get(near.city.id) ?? 0}
            onPick={onPick}
            hint={`${Math.round(near.km)}km`}
          />
        </ul>
      </section>
    );
  }
  return (
    <button type="button" className={styles.locate} onClick={onLocate} disabled={geo.status === 'locating'}>
      {geo.status === 'locating' ? (
        <Loader2 className={styles.spin} aria-hidden />
      ) : (
        <LocateFixed aria-hidden />
      )}
      <span>{geo.status === 'error' ? '위치를 찾지 못했어요. 다시 시도' : '현재 위치로 찾기'}</span>
    </button>
  );
}

/** 홈 기준 가까운 미방문 도시 5곳 (홈이 없으면 아직 안 간 상징 도시) */
function Recommendations({ homeId, visits, onPick }: Pick<Props, 'homeId' | 'visits' | 'onPick'>) {
  const home = homeId ? getCity(homeId) : undefined;
  const list = useMemo(() => {
    if (home)
      return nearestCities(CITIES, home, 5, (id) => id === home.id || visits.has(id)).map((n) => n.city);
    return CITIES.filter((c) => c.tier === 1 && !visits.has(c.id))
      .sort((a, b) => b.population - a.population)
      .slice(0, 5);
  }, [home, visits]);
  if (list.length === 0) return null;
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>
        {home ? `${home.name.ko} 근처, 아직 안 가본 곳` : '아직 안 가본 대표 도시'}
      </h3>
      <ul className={styles.list}>
        {list.map((c) => (
          <CityRow key={c.id} city={c} visits={0} onPick={onPick} />
        ))}
      </ul>
    </section>
  );
}

function CityRow({
  city,
  visits,
  onPick,
  hint,
}: {
  city: City;
  visits: number;
  onPick: (id: string) => void;
  hint?: string;
}) {
  const country = getCountry(city.country);
  return (
    <li>
      <button type="button" className={styles.row} onClick={() => onPick(city.id)}>
        <Flag code={city.country} size={32} visited alt="" />
        <span className={styles.text}>
          <span className={styles.name}>{city.name.ko}</span>
          <span className={styles.meta}>
            {country?.name.ko}
            <span className={styles.tier} aria-label={TIER_LABEL[city.tier]}>
              {Array.from({ length: 4 - city.tier }, (_, i) => (
                <i key={i} />
              ))}
            </span>
            {hint && <span>· {hint}</span>}
          </span>
        </span>
        {visits > 0 && (
          <span className={styles.visited} aria-label={`${visits}번 방문함`}>
            <Check aria-hidden />
            {visits > 1 && <span>{visits}</span>}
          </span>
        )}
      </button>
    </li>
  );
}

const TIER_LABEL = { 1: '대표 도시', 2: '주요 도시', 3: '작은 도시' } as const;
