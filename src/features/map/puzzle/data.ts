import type { Bbox, Region, RegionsData } from '../../../data/types';
import type { FlagCollection } from './puzzle';

export interface PuzzleData {
  regions: Region[];
  bboxes: Record<string, Bbox>;
  flag: FlagCollection;
}

// 지도와 같은 청크를 쓰는 국기 퍼즐 데이터 (한 번만 불러온다)
let dataPromise: Promise<PuzzleData> | null = null;
export function loadPuzzleData(): Promise<PuzzleData> {
  dataPromise ??= Promise.all([
    import('../../../data/regions.json'),
    import('../../../data/regions-flag.json'),
  ]).then(([r, f]) => {
    const rd = r.default as unknown as RegionsData;
    return { regions: rd.regions, bboxes: rd.bboxes, flag: f.default as unknown as FlagCollection };
  });
  return dataPromise;
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** 한 나라의 조각을 (0,0)–(w,h) 상자 가운데에 메르카토르로 맞춘 좌표 */
export interface ProjectedPuzzle {
  width: number;
  height: number;
  /** 지역(조각) 바탕 [regionId, 링들] */
  regions: { id: string; rings: [number, number][][] }[];
  /** 국기 색 도형 */
  pieces: { regionId: string; color: string; rings: [number, number][][] }[];
}

export function projectPuzzle(data: PuzzleData, code: string, w: number, h: number): ProjectedPuzzle | null {
  const bbox = data.bboxes[code];
  if (!bbox) return null;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const top = mercY(maxLat);
  const spanX = (maxLon - minLon) * (Math.PI / 180);
  const spanY = top - mercY(minLat);
  const scale = Math.min(w / spanX, h / spanY);
  const ox = (w - spanX * scale) / 2;
  const oy = (h - spanY * scale) / 2;
  const pt = ([lon, lat]: number[]): [number, number] => [
    ox + (((lon! - minLon) * Math.PI) / 180) * scale,
    oy + (top - mercY(lat!)) * scale,
  ];
  const rings = (mp: number[][][][]) => mp.flatMap((poly) => poly.map((ring) => ring.map(pt)));
  return {
    width: w,
    height: h,
    regions: data.regions
      .filter((r) => r.country === code)
      .map((r) => ({ id: r.id, rings: rings(r.polygon) })),
    pieces: data.flag.features
      .filter((f) => f.properties.country === code)
      .map((f) => ({
        regionId: f.properties.regionId,
        color: f.properties.color,
        rings: rings(f.geometry.coordinates),
      })),
  };
}
