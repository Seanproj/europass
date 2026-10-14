import { createRequire } from 'node:module';
import area from '@turf/area';
import intersect from '@turf/intersect';
import union from '@turf/union';
import bboxPolygon from '@turf/bbox-polygon';
import { featureCollection, multiPolygon } from '@turf/helpers';
import polylabel from 'polylabel';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { COUNTRIES, EUROPE_BBOX } from './countries';

export type Bbox = [minLon: number, minLat: number, maxLon: number, maxLat: number];
export type CountryShape = Feature<MultiPolygon>;

// 유럽 범위 안에 있지만 지도에서 뺄 외딴 섬 (조각이 대륙 반대편까지 늘어나는 것을 막음)
const EXCLUDED_AREAS: Bbox[] = [
  [-9.2, 70.7, -7.8, 71.2], // 얀마옌 (노르웨이)
];

const require = createRequire(import.meta.url);

/** Natural Earth 50m 나라 경계를 유럽 범위로 잘라 ISO2 → MultiPolygon으로 반환 */
export function loadCountryShapes(): Map<string, CountryShape> {
  const topo = require('world-atlas/countries-50m.json') as Topology<{
    countries: GeometryCollection<{ name: string }>;
  }>;
  const all = feature(topo, topo.objects.countries).features as Feature<
    Polygon | MultiPolygon,
    { name: string }
  >[];
  const clip = bboxPolygon([EUROPE_BBOX.minLon, EUROPE_BBOX.minLat, EUROPE_BBOX.maxLon, EUROPE_BBOX.maxLat]);
  const result = new Map<string, CountryShape>();

  for (const c of COUNTRIES) {
    const parts = all.filter((f) => c.atlasNames.includes(f.properties.name));
    if (parts.length !== c.atlasNames.length) throw new Error(`world-atlas에서 ${c.code} 경계를 찾지 못함`);
    let merged: Feature<Polygon | MultiPolygon> | null = parts[0]!;
    for (const p of parts.slice(1)) merged = union(featureCollection([merged!, p]));
    merged = intersect(featureCollection([merged!, clip]));
    if (!merged) throw new Error(`${c.code} 경계가 유럽 범위 밖`);
    const polys = toPolygons(merged).filter((ring) => !EXCLUDED_AREAS.some((b) => ringInside(ring[0]!, b)));
    result.set(c.code, multiPolygon(polys, { code: c.code }));
  }
  return result;
}

export function toPolygons(f: Feature<Polygon | MultiPolygon>): Position[][][] {
  return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
}

function ringInside(ring: Position[], b: Bbox): boolean {
  return ring.every(([x, y]) => x! >= b[0] && x! <= b[2] && y! >= b[1] && y! <= b[3]);
}

export function bboxOf(polys: Position[][][]): Bbox {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys)
    for (const [x, y] of poly[0]!) {
      minX = Math.min(minX, x!);
      minY = Math.min(minY, y!);
      maxX = Math.max(maxX, x!);
      maxY = Math.max(maxY, y!);
    }
  return [minX, minY, maxX, maxY];
}

/** 넓이(km²) 기준으로 가장 큰 폴리곤부터 */
export function polygonsBySize(shape: CountryShape): { coords: Position[][]; km2: number }[] {
  return shape.geometry.coordinates
    .map((coords) => ({ coords, km2: area({ type: 'Polygon', coordinates: coords }) / 1e6 }))
    .sort((a, b) => b.km2 - a.km2);
}

/** 본토 범위: 가장 큰 폴리곤의 10% 이상인 폴리곤들의 bbox (멀리 떨어진 작은 섬 제외) */
export function mainlandBbox(shape: CountryShape): Bbox {
  const sized = polygonsBySize(shape);
  const big = sized.filter((p) => p.km2 >= sized[0]!.km2 * 0.1).map((p) => p.coords);
  return bboxOf(big);
}

/** 라벨 위치: 가장 큰 폴리곤 안쪽에서 경계와 가장 먼 점 (경도는 위도 보정한 평면에서 계산) */
export function labelPoint(shape: CountryShape): [number, number] {
  const largest = polygonsBySize(shape)[0]!.coords;
  const k = Math.cos((centerLat(largest) * Math.PI) / 180);
  const scaled = largest.map((ring) => ring.map(([x, y]): [number, number] => [x! * k, y!]));
  const p = polylabel(scaled, 0.01);
  return [round(p[0]! / k, 3), round(p[1]!, 3)];
}

function centerLat(poly: Position[][]): number {
  const ys = poly[0]!.map((p) => p[1]!);
  return (Math.min(...ys) + Math.max(...ys)) / 2;
}

export function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** 대략적인 거리(km). 수십 km 범위 비교용 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const k = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot((lon1 - lon2) * k, lat1 - lat2) * 111.2;
}
