import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import styles from './HomeSheet.module.css';
import { useUI } from '../../app/store';
import { db } from '../../db/db';
import type { Profile } from '../../db/types';
import { SearchPanel } from '../checkin/SearchPanel';
import { useCheckIn } from '../checkin/useCheckIn';
import { useGeolocation } from '../checkin/useGeolocation';
import { CityDetail } from './CityDetail';
import { Flag } from '../../components/Flag/Flag';
import { SearchField } from '../checkin/SearchField';
import { BottomSheet } from './BottomSheet';
import { SelectionCard } from './SelectionCard';
import type { Stats } from '../../lib/useStats';

interface Props {
  stats: Stats;
}

/** 항상 떠 있는 홈 시트: peek(검색 + 국기 줄) → half → full */
export function HomeSheet({ stats }: Props) {
  const snap = useUI((s) => s.sheetSnap);
  const setSnap = useUI((s) => s.setSheetSnap);
  const selection = useUI((s) => s.selection);
  const select = useUI((s) => s.select);
  const searchOpen = useUI((s) => s.searchOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const [query, setQuery] = useState('');
  const geo = useGeolocation();
  const checkIn = useCheckIn();
  const profile = useLiveQuery(() => db.settings.get('profile'), []);
  const homeId = (profile?.value as Profile | undefined)?.homeCityId;

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };
  const pick = (cityId: string) => {
    setQuery('');
    void checkIn(cityId);
  };

  return (
    <BottomSheet
      label="나의 유럽"
      snap={snap}
      onSnapChange={setSnap}
      header={
        <>
          <SearchField
            active={searchOpen}
            query={query}
            onQueryChange={setQuery}
            onOpen={() => setSearchOpen(true)}
            onLocate={() => {
              setSearchOpen(true);
              geo.locate();
            }}
            onClose={closeSearch}
            onSubmit={() => {
              // 엔터: 첫 번째 결과로 체크인
              const first = document.querySelector<HTMLButtonElement>('[aria-label="검색 결과"] button');
              first?.click();
            }}
            canLocate={geo.state.status !== 'hidden'}
          />
          {!searchOpen && <FlagRow codes={stats.countryCodes} />}
        </>
      }
    >
      {searchOpen ? (
        <SearchPanel
          query={query}
          visits={stats.counts}
          homeId={homeId}
          geo={geo.state}
          onLocate={geo.locate}
          onPick={pick}
        />
      ) : (
        <>
          {selection?.kind === 'city' && (
            <CityDetail cityId={selection.id} onCheckIn={pick} onClose={() => select(null)} />
          )}
          {selection?.kind === 'country' && (
            <SelectionCard selection={selection} visits={stats.counts} onClose={() => select(null)} />
          )}
          <MyEurope stats={stats} />
        </>
      )}
    </BottomSheet>
  );
}

function MyEurope({ stats }: { stats: Stats }) {
  return (
    <>
      <section className={styles.mine}>
        <h2 className={styles.title}>나의 유럽</h2>
        <p className={styles.meta}>
          {stats.countries}개국 · {stats.cities}개 도시
          {stats.visits > stats.cities ? ` · ${stats.visits}번 방문` : ''}
        </p>
        {stats.visits === 0 && (
          <p className={styles.empty}>
            아직 도장이 없어요.
            <br />
            다녀온 도시를 검색해서 첫 도장을 찍어보세요.
          </p>
        )}
      </section>
    </>
  );
}

/** 방문한 나라의 국기 줄 */
function FlagRow({ codes }: { codes: string[] }) {
  if (codes.length === 0) {
    return <p className={styles.flagHint}>첫 도장을 찍으면 여기에 국기가 모여요</p>;
  }
  const shown = codes.slice(0, 7);
  const more = codes.length - shown.length;
  return (
    <ul className={styles.flags} aria-label="방문한 나라">
      {shown.map((c) => (
        <li key={c} className={styles.flag}>
          <Flag code={c} size={30} visited />
        </li>
      ))}
      {more > 0 && <li className={styles.more}>+{more}</li>}
    </ul>
  );
}
