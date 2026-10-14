import { useEffect, useMemo, useRef, useState } from 'react';
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
import { NavAction, NavHeader } from './NavHeader';
import { Share2 } from 'lucide-react';
import { todayISO } from '../../lib/date';
import { getProfile } from '../profile/profile';
import { ShareDialog, type ShareFormat } from '../share/ShareDialog';
import { makeCityCard, makeCountryCard } from '../share/share';
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
  const [share, setShare] = useState<ShareFormat | null>(null);
  const geo = useGeolocation();
  const checkIn = useCheckIn();

  const visits = useLiveQuery(() => db.visits.toArray(), [], EMPTY);
  // 기록이 하나도 없이 시작하면 시트를 반쯤 열어 첫 도장 안내가 보이게 (시작할 때 한 번만)
  const total = useLiveQuery(() => db.visits.count(), []);
  const checkedStart = useRef(false);
  useEffect(() => {
    if (total === undefined || checkedStart.current) return;
    checkedStart.current = true;
    const ui = useUI.getState();
    if (total === 0 && ui.route.kind === 'home' && ui.sheetSnap === 'peek') ui.setSheetSnap('half');
  }, [total]);
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
  // 프로필 페이지가 덮고 있을 때 아래 시트는 홈 그대로
  if (
    route.kind === 'home' ||
    route.kind === 'profile' ||
    route.kind === 'wrap' ||
    route.kind === 'public' ||
    searchOpen
  ) {
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
      <HomeView countries={countries} byCity={byCity} homeId={homeId} onSearch={() => setSearchOpen(true)} />
    );
  } else if (route.kind === 'country') {
    const country = getCountry(route.code);
    const progress = countries.find((c) => c.code === route.code);
    const code = route.code;
    header = (
      <NavHeader
        title={country?.name.ko ?? code}
        action={
          progress && progress.cities > 0 ? (
            <NavAction
              label={`${country?.name.ko} 카드 공유`}
              icon={<Share2 aria-hidden />}
              onClick={() =>
                setShare({
                  id: `country-${code}`,
                  label: '국가 카드',
                  aspect: 4 / 5,
                  fileName: `euro-passport-${code.toLowerCase()}-${todayISO()}.png`,
                  make: async () => makeCountryCard(code, await db.visits.toArray(), await getProfile(db)),
                })
              }
            />
          ) : undefined
        }
      />
    );
    body = progress && <CountryView key={route.code} code={route.code} progress={progress} byCity={byCity} />;
  } else {
    const city = getCity(route.id);
    const id = route.id;
    // 도시 카드는 두 번 이상 간 도시만 ("프라하와 나 · 3번의 방문")
    const many = (byCity.get(id)?.length ?? 0) >= 2;
    header = (
      <NavHeader
        title={city ? `${getCountry(city.country)?.name.ko} · ${city.name.ko}` : ''}
        action={
          city && many ? (
            <NavAction
              label={`${city.name.ko} 카드 공유`}
              icon={<Share2 aria-hidden />}
              onClick={() =>
                setShare({
                  id: `city-${id}`,
                  label: '도시 카드',
                  aspect: 4 / 5,
                  fileName: `euro-passport-${id}-${todayISO()}.png`,
                  make: async () => makeCityCard(id, await db.visits.toArray(), await getProfile(db)),
                })
              }
            />
          ) : undefined
        }
      />
    );
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
    <>
      <BottomSheet label="나의 유럽" snap={snap} onSnapChange={setSnap} header={header}>
        {body}
      </BottomSheet>
      <ShareDialog
        open={!!share}
        title={share?.label ?? ''}
        formats={share ? [share] : []}
        onClose={() => setShare(null)}
      />
    </>
  );
}
