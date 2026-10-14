import { useEffect, useMemo, useState } from 'react';
import styles from './PuzzleMinimap.module.css';
import { FLAG_BLACK } from '../../data/flags';
import type { Bbox, Region, RegionsData } from '../../data/types';
import type { FlagCollection } from '../map/puzzle/puzzle';
import { puzzleColor } from '../map/puzzle/puzzle';

interface PuzzleData {
  regions: Region[];
  bboxes: Record<string, Bbox>;
  flag: FlagCollection;
}

// 지도와 같은 청크를 쓰는 국기 퍼즐 데이터 (한 번만 불러온다)
let dataPromise: Promise<PuzzleData> | null = null;
function loadPuzzle(): Promise<PuzzleData> {
  dataPromise ??= Promise.all([
    import('../../data/regions.json'),
    import('../../data/regions-flag.json'),
  ]).then(([r, f]) => {
    const rd = r.default as unknown as RegionsData;
    return { regions: rd.regions, bboxes: rd.bboxes, flag: f.default as unknown as FlagCollection };
  });
  return dataPromise;
}

const W = 320;
const MAX_H = 240;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

interface Props {
  code: string;
  painted: Set<string>;
  selected: string | null;
  onPick: (regionId: string | null) => void;
}

/** 국가 상세의 국기 퍼즐 미니맵: 칠한 조각은 국기 색, 빈 조각은 점선. 조각을 탭하면 그 조각의 도시 목록 */
export function PuzzleMinimap({ code, painted, selected, onPick }: Props) {
  const [data, setData] = useState<PuzzleData | null>(null);
  useEffect(() => {
    let alive = true;
    void loadPuzzle().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const [minLon, minLat, maxLon, maxLat] = data.bboxes[code]!;
    const top = mercY(maxLat);
    const spanX = (maxLon - minLon) * (Math.PI / 180);
    const spanY = top - mercY(minLat);
    // 가로 W, 세로 MAX_H 안에 들어가도록 (세로로 긴 나라는 세로 기준)
    const scale = Math.min(W / spanX, MAX_H / spanY);
    const width = spanX * scale;
    const H = spanY * scale;
    const offsetX = (W - width) / 2;
    const pt = (lon: number, lat: number) =>
      `${(offsetX + (((lon - minLon) * Math.PI) / 180) * scale).toFixed(1)},${((top - mercY(lat)) * scale).toFixed(1)}`;
    const path = (mp: number[][][][]) =>
      mp
        .map((poly) => poly.map((ring) => `M${ring.map(([x, y]) => pt(x!, y!)).join('L')}Z`).join(''))
        .join('');
    const regions = data.regions
      .filter((r) => r.country === code)
      .map((r) => ({ region: r, d: path(r.polygon) }));
    const pieces = data.flag.features
      .filter((f) => f.properties.country === code)
      .map((f) => ({
        regionId: f.properties.regionId,
        color: f.properties.color,
        d: path(f.geometry.coordinates),
      }));
    return { H, regions, pieces };
  }, [data, code]);

  if (!view) return <div className={styles.placeholder} aria-hidden />;

  return (
    <svg className={styles.map} viewBox={`0 0 ${W} ${view.H}`} role="group" aria-label="국기 퍼즐">
      {view.regions.map(({ region, d }) => (
        <path key={`base-${region.id}`} d={d} className={styles.land} />
      ))}
      {view.pieces
        .filter((p) => painted.has(p.regionId))
        .map((p, i) => (
          <path
            key={`${p.regionId}-${i}`}
            d={p.d}
            className={styles.piece}
            style={{
              fill: p.color.toUpperCase() === FLAG_BLACK ? 'var(--flag-black)' : puzzleColor(p.color, ''),
            }}
          />
        ))}
      {view.regions.map(({ region, d }) => {
        const on = painted.has(region.id);
        return (
          <path
            key={region.id}
            d={d}
            className={`${styles.hit} ${on ? styles.painted : styles.empty} ${selected === region.id ? styles.selected : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${region.name.ko}${on ? ' (칠함)' : ''}`}
            aria-pressed={selected === region.id}
            onClick={() => onPick(selected === region.id ? null : region.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(selected === region.id ? null : region.id);
              }
            }}
          />
        );
      })}
    </svg>
  );
}
