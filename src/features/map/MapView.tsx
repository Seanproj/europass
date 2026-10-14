import { useEffect, useMemo, useRef, useState } from 'react';
import { THEME_EVENT } from '../profile/theme';
import { registerMapSnapshot } from './snapshot';
import { registerTileTemplates } from './prefetch';
import { useLiveQuery } from 'dexie-react-hooks';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './MapView.module.css';
import { db } from '../../db/db';
import type { Profile, Visit } from '../../db/types';
import { getCity } from '../../data/cities';
import type { RegionsData } from '../../data/types';
import { navigate } from '../../app/nav';
import { useUI, type Route } from '../../app/store';
import { MapPlaceholder } from './MapPlaceholder';
import { MapController, type MapData } from './MapController';
import { countryProgress, paintedRegions, type FlagCollection } from './puzzle/puzzle';
import { loadBaseStyle } from './style';
import { CountryTags, type CountryTagsHandle } from './tags/CountryTags';
import { CityMarkers, type CityMarkersHandle } from './tags/CityMarkers';
import { readMapTokens } from './tokens';

const EMPTY: Visit[] = [];

let tileErrorShown = false;
/** 타일을 못 받을 때 세션에 한 번만 조용히 알린다 */
function notifyTileError() {
  if (tileErrorShown) return;
  tileErrorShown = true;
  useUI.getState().showToast(
    {
      message: navigator.onLine
        ? '지도 일부를 불러오지 못했어요. 잠시 뒤 다시 시도해요'
        : '오프라인이에요. 저장해 둔 지역만 자세히 보여요',
    },
    { queue: true },
  );
}

function supportsWebGL2(): boolean {
  if (typeof WebGL2RenderingContext === 'undefined') return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/** 국기 퍼즐 데이터(약 1MB)는 지도와 함께 따로 불러온다 */
async function loadMapData(): Promise<MapData> {
  const [regions, flag] = await Promise.all([
    import('../../data/regions.json'),
    import('../../data/regions-flag.json'),
  ]);
  const r = regions.default as unknown as RegionsData;
  return { regions: r.regions, bboxes: r.bboxes, flag: flag.default as unknown as FlagCollection };
}

/** 안개 지도: 지도 1개 + 안개·국기 퍼즐·렌즈·나라 태그 */
export function MapView() {
  const [webgl] = useState(supportsWebGL2);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const tagsRef = useRef<CountryTagsHandle>(null);
  const markersRef = useRef<CityMarkersHandle>(null);
  const ctrlRef = useRef<MapController | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [ready, setReady] = useState(false);
  const route = useUI((s) => s.route);
  const revealCity = useUI((s) => s.revealCity);

  const visits = useLiveQuery(() => db.visits.toArray(), [], EMPTY);
  const profile = useLiveQuery(() => db.settings.get('profile'), []);
  const homeId = (profile?.value as Profile | undefined)?.homeCityId;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of visits) m.set(v.cityId, (m.get(v.cityId) ?? 0) + 1);
    return m;
  }, [visits]);

  const visitedCities = useMemo(
    () =>
      [...counts].flatMap(([id, n]) => {
        const city = getCity(id);
        return city ? [{ city, visits: n }] : [];
      }),
    [counts],
  );

  const progress = useMemo(() => {
    if (!data) return new Map();
    return countryProgress(paintedRegions(counts.keys(), getCity), data.regions);
  }, [counts, data]);

  // 지도는 한 번만 만든다
  useEffect(() => {
    if (!webgl) return;
    const abort = new AbortController();
    let ctrl: MapController | null = null;
    void Promise.all([loadMapData(), loadBaseStyle(abort.signal)]).then(([mapData, base]) => {
      if (abort.signal.aborted || !containerRef.current || !overlayRef.current) return;
      setData(mapData);
      // 기본 지도 스타일을 못 받았으면(오프라인 등) 간단한 지도로 뜬다는 걸 알린다
      if (!base) notifyTileError();
      ctrl = new MapController({
        container: containerRef.current,
        overlay: overlayRef.current,
        base,
        data: mapData,
        tokens: readMapTokens(),
        onSelect: (s) =>
          navigate(s.kind === 'city' ? { kind: 'city', id: s.id } : { kind: 'country', code: s.code }),
        onTileError: notifyTileError,
        onFrame: (f) => {
          tagsRef.current?.update(ctrl!.map, f);
          markersRef.current?.update(ctrl!.map);
        },
      });
      ctrlRef.current = ctrl;
      // 개발 서버에서만: 콘솔·Playwright로 카메라를 움직여 확인할 수 있게
      if (import.meta.env.DEV) Object.assign(window, { __map: ctrl.map, __db: db });
      registerMapSnapshot((req) => ctrl!.snapshot(req));
      registerTileTemplates(() => ctrl!.tileTemplates());
      setReady(true);
    });
    return () => {
      abort.abort();
      registerMapSnapshot(null);
      registerTileTemplates(null);
      ctrl?.destroy();
      ctrlRef.current = null;
    };
  }, [webgl]);

  useEffect(() => {
    if (ready) ctrlRef.current?.setVisits(counts);
  }, [ready, counts]);

  useEffect(() => {
    if (ready) ctrlRef.current?.setHome(homeId);
  }, [ready, homeId]);

  // 시트에서 나라·도시를 고르면 지도가 따라간다. 첫 체크인이면 도착한 뒤 안개 구멍이 열린다
  const flyTo = (r: Route) => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    if (r.kind === 'country') ctrl.flyToCountry(r.code);
    if (r.kind === 'city') {
      const reveal = useUI.getState().revealCity === r.id;
      if (reveal) useUI.setState({ revealCity: null });
      ctrl.flyToCity(r.id, { reveal });
    }
  };
  useEffect(() => {
    if (ready) flyTo(route);
  }, [ready, route]);
  // 이미 그 도시 상세에 있을 때 체크인한 경우 (경로는 그대로라 위 효과가 돌지 않음)
  useEffect(() => {
    const r = useUI.getState().route;
    if (ready && revealCity && r.kind === 'city' && r.id === revealCity) flyTo(r);
  }, [ready, revealCity]);

  // 라이트/다크 전환 (시스템 설정 또는 프로필의 테마 설정)
  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => ctrlRef.current?.setTokens(readMapTokens());
    mq.addEventListener('change', onChange);
    window.addEventListener(THEME_EVENT, onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener(THEME_EVENT, onChange);
    };
  }, [ready]);

  if (!webgl) return <MapPlaceholder />;

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.map} role="region" aria-label="유럽 지도" />
      <canvas ref={overlayRef} className={styles.overlay} aria-hidden="true" />
      {data && (
        <CityMarkers
          ref={markersRef}
          cities={visitedCities}
          onPick={(id) => navigate({ kind: 'city', id })}
        />
      )}
      {data && (
        <CountryTags
          ref={tagsRef}
          progress={progress}
          onPick={(code) => {
            navigate({ kind: 'country', code });
          }}
        />
      )}
    </div>
  );
}
