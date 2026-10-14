import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUI } from '../../app/store';
import { getCity, getCountry } from '../../data/cities';
import { db } from '../../db/db';
import { visitsByCity } from '../../db/selectors';
import type { Profile, Visit } from '../../db/types';
import { SearchField } from '../checkin/SearchField';
import { SearchPanel } from '../checkin/SearchPanel';
import { useCheckIn } from '../checkin/useCheckIn';
import { useGeolocation } from '../checkin/useGeolocation';
import { BottomSheet } from './BottomSheet';
import { CityView } from './CityView';
import { CountryView } from './CountryView';
import { FlagRings } from './FlagRings';
import { HomeView } from './HomeView';
import { NavHeader } from './NavHeader';
import { countryProgress, sortCountries } from './progress';

const EMPTY: Visit[] = [];

/** 시트 하나 안의 내비게이션: 홈(검색 · 나라/도시 목록) → 국가 상세 → 도시 상세 */
export function HomeSheet() {
  const snap = useUI((s) => s.sheetSnap);
  const setSnap = useUI((s) => s.setSheetSnap);
  const route = useUI((s) => s.route);
  const searchOpen = useUI((s) => s.searchOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const [query, setQuery] = useState('');
  const geo = useGeolocation();
  const checkIn = useCheckIn();

  const visits = useLiveQuery(() => db.visits.toArray(), [], EMPTY);
  const profile = useLiveQuery(() => db.settings.get('profile'), []);
  const homeId = (profile?.value as Profile | undefined)?.homeCityId;

  const byCity = useMemo(() => visitsByCity(visits), [visits]);
  const counts = useMemo(() => new Map([...byCity].map(([id, list]) => [id, list.length])), [byCity]);
  const countries = useMemo(
    () => sortCountries([...countryProgress(visits, getCity).values()], (c) => getCountry(c)?.name.ko ?? c),
    [visits],
  );
  const visitedCountries = useMemo(() => countries.filter((c) => c.cities > 0), [countries]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };
  const pick = (cityId: string, date?: string) => {
    setQuery('');
    void checkIn(cityId, date);
  };

  let header;
  let body;
  if (route.kind === 'home' || searchOpen) {
    header = (
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
            document.querySelector<HTMLButtonElement>('[aria-label="검색 결과"] button')?.click();
          }}
          canLocate={geo.state.status !== 'hidden'}
        />
        {!searchOpen && <FlagRings list={visitedCountries} />}
      </>
    );
    body = searchOpen ? (
      <SearchPanel
        query={query}
        visits={counts}
        homeId={homeId}
        geo={geo.state}
        onLocate={geo.locate}
        onPick={pick}
      />
    ) : (
      <HomeView countries={countries} byCity={byCity} />
    );
  } else if (route.kind === 'country') {
    const country = getCountry(route.code);
    const progress = countries.find((c) => c.code === route.code);
    header = <NavHeader title={country?.name.ko ?? route.code} />;
    body = progress && <CountryView key={route.code} code={route.code} progress={progress} byCity={byCity} />;
  } else {
    const city = getCity(route.id);
    header = <NavHeader title={city ? `${getCountry(city.country)?.name.ko} · ${city.name.ko}` : ''} />;
    body = (
      <CityView
        key={route.id}
        cityId={route.id}
        visits={byCity.get(route.id) ?? EMPTY}
        homeId={homeId}
        onCheckIn={pick}
      />
    );
  }

  return (
    <BottomSheet label="나의 유럽" snap={snap} onSnapChange={setSnap} header={header}>
      {body}
    </BottomSheet>
  );
}
