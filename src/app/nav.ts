import { useEffect } from 'react';
import { getCity, getCountry } from '../data/cities';
import { HOME, useUI, type Route } from './store';

/** URL 쿼리 → 화면. 모르는 나라·도시는 홈으로 */
export function routeFromSearch(search: string): Route {
  const q = new URLSearchParams(search);
  const city = q.get('city');
  if (city && getCity(city)) return { kind: 'city', id: city };
  const country = q.get('country')?.toUpperCase();
  if (country && getCountry(country)) return { kind: 'country', code: country };
  return HOME;
}

export function searchFromRoute(r: Route): string {
  if (r.kind === 'city') return `?city=${encodeURIComponent(r.id)}`;
  if (r.kind === 'country') return `?country=${r.code}`;
  return '';
}

export function sameRoute(a: Route, b: Route): boolean {
  return searchFromRoute(a) === searchFromRoute(b);
}

interface HistoryState {
  /** 앱 안에서 몇 단계 들어왔는지. 0이면 홈 (뒤로가기로 앱 밖으로 나가지 않게) */
  depth: number;
}

const depthNow = () => (history.state as HistoryState | null)?.depth ?? 0;
const urlFor = (r: Route) => `${location.pathname}${searchFromRoute(r)}${location.hash}`;

/** 시트 화면 이동. 상세로 들어가면 시트를 반쯤 펼친다 */
export function navigate(route: Route, { replace = false } = {}) {
  const ui = useUI.getState();
  if (sameRoute(route, ui.route)) return;
  if (replace) history.replaceState({ depth: depthNow() } satisfies HistoryState, '', urlFor(route));
  else history.pushState({ depth: depthNow() + 1 } satisfies HistoryState, '', urlFor(route));
  apply(route);
}

/** 시트 좌상단 화살표. 브라우저 뒤로가기와 같은 동작 */
export function goBack() {
  if (depthNow() > 0) history.back();
  else navigate(HOME, { replace: true });
}

function apply(route: Route) {
  const ui = useUI.getState();
  useUI.setState({
    route,
    searchOpen: false,
    sheetSnap: route.kind !== 'home' && ui.sheetSnap === 'peek' ? 'half' : ui.sheetSnap,
  });
}

/**
 * 처음 열 때 URL(?country=CZ, ?city=cz-prague)을 읽고, 브라우저 뒤로·앞으로를 따라간다.
 * 딥링크로 들어와도 뒤로가기 한 번이면 홈으로 오도록 홈 기록을 아래에 깐다
 */
export function useNavSync() {
  useEffect(() => {
    const initial = routeFromSearch(location.search);
    history.replaceState({ depth: 0 } satisfies HistoryState, '', urlFor(HOME));
    if (initial.kind !== 'home') {
      history.pushState({ depth: 1 } satisfies HistoryState, '', urlFor(initial));
      apply(initial);
    }
    const onPop = () => apply(routeFromSearch(location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
