import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type { MapTokens } from './tokens';

/** OpenFreeMap positron (API 키 없음) */
export const POSITRON_URL = 'https://tiles.openfreemap.org/styles/positron';
export const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

/** 한글 라벨: name:ko → name */
export const NAME_KO: ExpressionSpecification = ['coalesce', ['get', 'name:ko'], ['get', 'name']];

/** 한글은 글리프 서버 대신 기기 서체로 그린다 (Pretendard 우선) */
export const LOCAL_IDEOGRAPH_FONT =
  "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

// 유럽 전체(z5)에서는 흐린 회색, 도시(z9+)에서는 컬러 상세 지도
const zoomBlend = (low: string, high: string): ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  low,
  9,
  high,
];

const sourceLayer = (l: LayerSpecification) => ('source-layer' in l ? l['source-layer'] : undefined);

/** 나라 경계 레이어 (국기 퍼즐 위로 올린다) */
export function isBoundaryLayer(l: LayerSpecification): boolean {
  return l.type === 'line' && sourceLayer(l) === 'boundary';
}

/**
 * positron 스타일을 우리 토큰 색으로 덮어쓴다.
 * 레이어 id 대신 source-layer(OpenMapTiles 스키마)와 타입으로 판단해 스타일이 조금 바뀌어도 동작하게 한다.
 * @param forSnapshot 렌즈 스냅샷용: 라벨을 빼고 상세 색만
 */
export function themeStyle(base: StyleSpecification, t: MapTokens, forSnapshot = false): StyleSpecification {
  const layers: LayerSpecification[] = [];
  for (const src of base.layers) {
    const l = structuredClone(src) as LayerSpecification & {
      paint?: Record<string, unknown>;
      layout?: Record<string, unknown>;
    };
    const sl = sourceLayer(l);
    const paint = (l.paint ??= {});
    const layout = (l.layout ??= {});
    const id = l.id.toLowerCase();

    if (l.type === 'background') {
      paint['background-color'] = forSnapshot ? t.dBg : zoomBlend(t.land, t.dBg);
    } else if (l.type === 'fill') {
      if (sl === 'water') paint['fill-color'] = forSnapshot ? t.dWater : zoomBlend(t.water, t.dWater);
      else if (sl === 'park' || (sl === 'landcover' && /wood|grass|forest|park|scrub/.test(id))) {
        paint['fill-color'] = t.dPark;
        paint['fill-opacity'] = forSnapshot ? 1 : ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 1];
      } else if (sl === 'building') {
        paint['fill-color'] = t.dRoof;
        delete paint['fill-outline-color'];
      } else if (sl === 'aeroway') {
        paint['fill-color'] = t.dStreet;
      } else if (sl === 'landuse') {
        paint['fill-color'] = t.dStreet;
        paint['fill-opacity'] = 0.35;
      }
    } else if (l.type === 'line') {
      if (sl === 'waterway') paint['line-color'] = t.dWater;
      else if (sl === 'transportation') paint['line-color'] = /casing|outline/.test(id) ? t.dStreet : t.dRoad;
      else if (sl === 'boundary') paint['line-color'] = t.text2;
      else if (sl === 'aeroway') paint['line-color'] = /casing/.test(id) ? t.dStreet : t.dRoad;
    } else if (l.type === 'symbol') {
      if (forSnapshot) continue;
      // 도로 번호 방패는 밝은 아이콘이라 다크 모드에서 흰 네모로 보이고, 이 앱에는 필요 없다
      if (sl === 'transportation_name' && layout['icon-image'] !== undefined) continue;
      if (layout['text-field'] !== undefined) layout['text-field'] = NAME_KO;
      paint['text-color'] = t.text;
      paint['text-halo-color'] = t.dBg;
      // 나라 이름은 우리 나라 태그가 대신하고, 나머지 라벨은 안개 구멍이 열리는 줌부터
      if (sl === 'place' && /country|continent|state/.test(id)) layout.visibility = 'none';
      l.minzoom = Math.max(l.minzoom ?? 0, 8);
    }
    if (forSnapshot && l.type === 'line' && sl === 'boundary') continue;
    layers.push(l);
  }
  return { ...base, layers };
}

/** 타일 서버에 닿지 않을 때(오프라인 등) 쓰는 최소 스타일: 배경만 두고 우리 레이어를 얹는다 */
export function fallbackStyle(t: MapTokens): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': t.water } }],
  };
}

/** 베이스 스타일을 받는다. 느리거나 막혀 있으면 6초 뒤 포기하고 null (최소 스타일로 시작) */
export async function loadBaseStyle(
  signal?: AbortSignal,
  timeoutMs = 6000,
): Promise<StyleSpecification | null> {
  try {
    const res = await fetch(POSITRON_URL, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as StyleSpecification;
  } catch {
    return null;
  }
}
