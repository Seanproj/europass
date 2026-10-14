import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './MapView.module.css';
import { db } from '../../db/db';
import type { Profile, Visit } from '../../db/types';
import { getCity } from '../../data/cities';
import type { RegionsData } from '../../data/types';
import { useUI } from '../../app/store';
import { MapPlaceholder } from './MapPlaceholder';
import { MapController, type MapData } from './MapController';
import { countryProgress, paintedRegions, type FlagCollection } from './puzzle/puzzle';
import { loadBaseStyle } from './style';
import { CountryTags, type CountryTagsHandle } from './tags/CountryTags';
import { readMapTokens } from './tokens';

const EMPTY: Visit[] = [];

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
  const ctrlRef = useRef<MapController | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [ready, setReady] = useState(false);
  const select = useUI((s) => s.select);

  const visits = useLiveQuery(() => db.visits.toArray(), [], EMPTY);
  const profile = useLiveQuery(() => db.settings.get('profile'), []);
  const homeId = (profile?.value as Profile | undefined)?.homeCityId;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of visits) m.set(v.cityId, (m.get(v.cityId) ?? 0) + 1);
    return m;
  }, [visits]);

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
      ctrl = new MapController({
        container: containerRef.current,
        overlay: overlayRef.current,
        base,
        data: mapData,
        tokens: readMapTokens(),
        onSelect: (s) =>
          select(s.kind === 'city' ? { kind: 'city', id: s.id } : { kind: 'country', code: s.code }),
        onFrame: (f) => tagsRef.current?.update(ctrl!.map, f),
      });
      ctrlRef.current = ctrl;
      // 개발 서버에서만: 콘솔·Playwright로 카메라를 움직여 확인할 수 있게
      if (import.meta.env.DEV) Object.assign(window, { __map: ctrl.map, __db: db });
      setReady(true);
    });
    return () => {
      abort.abort();
      ctrl?.destroy();
      ctrlRef.current = null;
    };
  }, [webgl, select]);

  useEffect(() => {
    if (ready) ctrlRef.current?.setVisits(counts);
  }, [ready, counts]);

  useEffect(() => {
    if (ready) ctrlRef.current?.setHome(homeId);
  }, [ready, homeId]);

  // 라이트/다크 전환
  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => ctrlRef.current?.setTokens(readMapTokens());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [ready]);

  if (!webgl) return <MapPlaceholder />;

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.map} role="region" aria-label="유럽 지도" />
      <canvas ref={overlayRef} className={styles.overlay} aria-hidden="true" />
      {data && (
        <CountryTags
          ref={tagsRef}
          progress={progress}
          onPick={(code) => {
            ctrlRef.current?.flyToCountry(code);
            select({ kind: 'country', code });
          }}
        />
      )}
    </div>
  );
}
