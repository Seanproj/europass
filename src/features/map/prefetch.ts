import { TILE_HOST } from '../../sw/config';

/** 지도 타일 좌표 */
export interface Tile {
  z: number;
  x: number;
  y: number;
}

const lon2x = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/** 한 점 둘레 radiusKm 안에 걸치는 타일 (줌마다) */
export function tilesAround(lat: number, lon: number, radiusKm: number, zooms: number[]): Tile[] {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const out: Tile[] = [];
  for (const z of zooms) {
    const max = 2 ** z - 1;
    const x0 = Math.max(0, lon2x(lon - dLon, z));
    const x1 = Math.min(max, lon2x(lon + dLon, z));
    const y0 = Math.max(0, lat2y(lat + dLat, z));
    const y1 = Math.min(max, lat2y(lat - dLat, z));
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ z, x, y });
  }
  return out;
}

export const tileUrl = (template: string, t: Tile) =>
  template.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y));

/** 도시 상세 렌즈가 보여 주는 범위 (z8~13, 반경 4km) */
export const PREFETCH_ZOOMS = [8, 9, 10, 11, 12, 13];
export const PREFETCH_RADIUS_KM = 4;

// ── 설정 (기기마다 다를 수 있어 localStorage) ─────────────────────

const KEY = 'euro-passport:prefetch-tiles';

export function loadPrefetchSetting(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function savePrefetchSetting(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // 저장이 막혀도 무시
  }
}

type Connection = { type?: string; saveData?: boolean };

/**
 * 와이파이일 때만. 연결 종류를 알려 주는 브라우저(안드로이드 Chrome)는 wifi/ethernet만,
 * 알려 주지 않는 브라우저는 데이터 절약 모드가 아닐 때만 받는다
 */
export function onUnmeteredNetwork(
  conn: Connection | undefined = (navigator as { connection?: Connection }).connection,
) {
  if (!navigator.onLine) return false;
  if (conn?.saveData) return false;
  if (conn?.type) return conn.type === 'wifi' || conn.type === 'ethernet';
  return true;
}

let templates: () => string[] = () => [];

/** 지도가 준비되면 벡터 타일 주소 틀을 알려 준다 (MapView) */
export function registerTileTemplates(fn: (() => string[]) | null) {
  templates = fn ?? (() => []);
}

/**
 * 체크인 직후 그 도시 둘레 타일을 백그라운드로 받아 둔다 (서비스 워커가 map-tiles 캐시에 담는다).
 * 설정이 꺼져 있거나 와이파이가 아니면 아무것도 안 한다. 반환: 요청한 타일 수
 */
export async function prefetchCityTiles(lat: number, lon: number): Promise<number> {
  if (!loadPrefetchSetting() || !onUnmeteredNetwork()) return 0;
  const list = templates().filter((t) => t.includes(TILE_HOST));
  if (list.length === 0) return 0;
  const urls = list.flatMap((tpl) =>
    tilesAround(lat, lon, PREFETCH_RADIUS_KM, PREFETCH_ZOOMS).map((t) => tileUrl(tpl, t)),
  );
  // 4개씩 차례로 (지도 화면의 요청을 밀어내지 않게)
  for (let i = 0; i < urls.length; i += 4) {
    await Promise.all(urls.slice(i, i + 4).map((u) => fetch(u, { mode: 'cors' }).catch(() => undefined)));
  }
  return urls.length;
}
