/**
 * 국기 퍼즐 조각 생성: 나라마다 대표 도시(anchor)를 골라 국토를 보로노이 분할
 *   npm run data:regions
 * 입력: src/data/cities.json (build-cities 결과), world-atlas 나라 경계
 * 출력: src/data/regions.json, src/data/regions-flag.json, cities.json의 regionId
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Delaunay } from 'd3-delaunay';
import area from '@turf/area';
import centroid from '@turf/centroid';
import difference from '@turf/difference';
import intersect from '@turf/intersect';
import simplify from '@turf/simplify';
import union from '@turf/union';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { featureCollection, polygon } from '@turf/helpers';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { ROOT, writeJson } from './lib/cache';
import { COUNTRIES } from './lib/countries';
import { readCsv } from './lib/csv';
import {
  type Bbox,
  bboxOf,
  loadCountryShapes,
  mainlandBbox,
  polygonsBySize,
  round,
  toPolygons,
} from './lib/geo';
import { FLAGS, type FlagDef } from '../src/data/flags';
import type { City, Region, RegionsData } from '../src/data/types';

const OUT = join(ROOT, 'src', 'data');
const MIN_PIECES = 3;
const MAX_PIECES = 12;
// 나라 넓이(km²)의 제곱근을 이 값으로 나눠 조각 수를 정한다 (독일 ≈ 10, 네덜란드 ≈ 3)
const KM_PER_PIECE = 60;

type Poly = Feature<Polygon | MultiPolygon>;

function main() {
  const citiesPath = join(OUT, 'cities.json');
  const cities = JSON.parse(readFileSync(citiesPath, 'utf8')) as City[];
  const shapes = loadCountryShapes();
  const overrides = readCsv(join(ROOT, 'data', 'anchors-override.csv'));

  const regions: Region[] = [];
  const bboxes: Record<string, Bbox> = {};
  const flagFeatures: Feature<MultiPolygon, { regionId: string; country: string; color: string }>[] = [];

  for (const country of COUNTRIES) {
    const shape = shapes.get(country.code)!;
    const own = cities.filter((c) => c.country === country.code);
    const km2 = polygonsBySize(shape).reduce((s, p) => s + p.km2, 0);
    const anchors = pickAnchors(own, km2, overrides);

    // 위도 보정 평면(x = 경도·cos φ)에서 보로노이 → 나라 경계로 자른다
    const [minX, minY, maxX, maxY] = bboxOf(shape.geometry.coordinates);
    const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
    const pts = anchors.map((a) => [a.lon * k, a.lat] as [number, number]);
    const voronoi = Delaunay.from(pts).voronoi([minX * k - 5, minY - 5, maxX * k + 5, maxY + 5]);
    // 조각이 작을수록 단순화를 덜 하고 좌표 자릿수를 늘린다
    const pieceKm = Math.sqrt(km2 / anchors.length);
    const tolerance = Math.min(0.01, Math.max(0.0002, pieceKm / 111 / 50));
    const digits = pieceKm < 60 ? 4 : 3;

    const pieces = anchors.map((anchor, i) => {
      const cell = voronoi.cellPolygon(i).map(([x, y]) => [x! / k, y!]);
      const clipped = intersect(featureCollection<Polygon | MultiPolygon>([polygon([cell]), shape]));
      if (!clipped) throw new Error(`${anchor.id} 조각이 나라 경계와 겹치지 않음`);
      return { anchor, geom: clipped };
    });

    for (const { anchor, geom } of pieces) {
      const simple = simplify(geom, { tolerance, highQuality: true });
      const coords = roundCoords(toPolygons(simple), digits);
      regions.push({
        id: anchor.id,
        country: country.code,
        name: { ko: `${anchor.name.ko} 지역`, en: `${anchor.name.en} region` },
        anchorCityId: anchor.id,
        polygon: coords,
      });
      for (const piece of flagPieces(FLAGS[country.code]!, mainlandBbox(shape), geom)) {
        const p = simplify(piece.geom, { tolerance, highQuality: true });
        const pc = roundCoords(toPolygons(p), digits);
        if (pc.length === 0) continue;
        flagFeatures.push({
          type: 'Feature',
          properties: { regionId: anchor.id, country: country.code, color: piece.color },
          geometry: { type: 'MultiPolygon', coordinates: pc },
        });
      }
    }

    bboxes[country.code] = mainlandBbox(shape).map((v) => round(v, 3)) as Bbox;

    // 각 도시는 같은 나라에서 가장 가까운 anchor의 조각에 속한다 (보로노이와 같은 평면 기준)
    for (const c of own) {
      const idx = voronoi.delaunay.find(c.lon * k, c.lat);
      c.regionId = anchors[idx]!.id;
    }
    console.log(`${country.code} ${anchors.length}조각: ${anchors.map((a) => a.name.ko).join(', ')}`);
  }

  writeJson(citiesPath, cities);
  writeJson(join(OUT, 'regions.json'), { bboxes, regions } satisfies RegionsData);
  writeJson(join(OUT, 'regions-flag.json'), { type: 'FeatureCollection', features: flagFeatures });
  console.log(`\n조각 ${regions.length}개 · 국기 조각 ${flagFeatures.length}개`);
}

/** 수도 → tier1 → tier2 → tier3, 인구순으로 고르되 서로 너무 가까운 도시는 건너뛴다 */
function pickAnchors(own: City[], km2: number, overrides: Record<string, string>[]): City[] {
  const forced = own.filter((c) => overrides.some((o) => o.cityId === c.id && o.action === 'add'));
  const removed = new Set(overrides.filter((o) => o.action === 'remove').map((o) => o.cityId));
  const target = Math.min(
    own.length,
    clamp(Math.round(Math.sqrt(km2) / KM_PER_PIECE), MIN_PIECES, MAX_PIECES),
  );
  const ordered = own
    .filter((c) => !removed.has(c.id))
    .sort((a, b) => Number(b.capital) - Number(a.capital) || a.tier - b.tier || b.population - a.population);

  let minKm = 0.6 * Math.sqrt(km2 / target);
  for (;;) {
    const picked = [...forced];
    for (const c of ordered) {
      if (picked.length >= Math.max(target, forced.length)) break;
      if (picked.includes(c)) continue;
      if (picked.every((p) => distanceKm(p, c) >= minKm)) picked.push(c);
    }
    if (picked.length >= target || minKm < 0.01) return picked;
    minKm *= 0.7;
  }
}

const distanceKm = (a: City, b: City) =>
  Math.hypot((a.lon - b.lon) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180), a.lat - b.lat) * 111.2;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * 국기를 나라 본토 범위로 늘려 깔고, 조각과 겹치는 부분만 잘라낸다.
 * 본토 범위 밖의 섬(카나리아 제도 등)은 가장 가까운 국기 가장자리 색을 쓴다.
 */
function flagPieces(flag: FlagDef, frame: Bbox, region: Poly): { color: string; geom: Poly }[] {
  const [x0, y0, x1, y1] = frame;
  const toGeo = ([u, v]: [number, number]): Position => [x0 + u * (x1 - x0), y1 - v * (y1 - y0)];
  const toFlag = ([lon, lat]: Position): [number, number] => [
    (lon! - x0) / (x1 - x0),
    (y1 - lat!) / (y1 - y0),
  ];

  // 국기 도형을 서로 겹치지 않게 만든다 (위에 쌓인 도형을 아래 도형에서 뺀다). 반투명으로 칠해도 색이 섞이지 않게
  const geoShapes = flag.shapes.map((s) => ({
    color: s.color,
    geom: polygon([[...s.polygon, s.polygon[0]!].map(toGeo)]) as Poly,
  }));
  const disjoint: { color: string; geom: Poly }[] = [];
  let above: Poly | null = null;
  for (let i = geoShapes.length - 1; i >= 0; i--) {
    const s = geoShapes[i]!;
    const visible: Poly | null = above ? difference(featureCollection([s.geom, above])) : s.geom;
    if (visible) disjoint.unshift({ color: s.color, geom: visible });
    above = above ? union(featureCollection([above, s.geom])) : s.geom;
  }

  const byColor = new Map<string, Poly[]>();
  const add = (color: string, g: Poly | null) => {
    if (g && area(g) > 1) byColor.set(color, [...(byColor.get(color) ?? []), g]);
  };

  const framePoly = polygon([[toGeo([0, 0]), toGeo([1, 0]), toGeo([1, 1]), toGeo([0, 1]), toGeo([0, 0])]]);
  for (const s of disjoint) add(s.color, intersect(featureCollection([s.geom, region])));

  // 본토 범위 밖 부분: 폴리곤마다 중심점을 국기 안으로 끌어와 그 위치의 색으로 칠한다
  const outside = difference(featureCollection([region, framePoly]));
  if (outside) {
    for (const coords of toPolygons(outside)) {
      const part = polygon(coords);
      const [u, v] = toFlag(centroid(part).geometry.coordinates);
      const p = toGeo([clamp(u, 0.001, 0.999), clamp(v, 0.001, 0.999)]);
      const hit = disjoint.find((s) => booleanPointInPolygon(p, s.geom as Feature<Polygon | MultiPolygon>));
      if (hit) add(hit.color, part);
    }
  }

  // 같은 색은 하나로 합친다
  return [...byColor].map(([color, list]) => ({
    color,
    geom: list.length === 1 ? list[0]! : union(featureCollection(list))!,
  }));
}

function roundCoords(polys: Position[][][], digits: number): number[][][][] {
  return polys
    .map((poly) =>
      poly
        .map((ring) => dedupe(ring.map(([x, y]) => [round(x!, digits), round(y!, digits)])))
        .filter((ring) => ring.length >= 4),
    )
    .filter((poly) => poly.length > 0);
}

function dedupe(ring: number[][]): number[][] {
  return ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1]![0] || p[1] !== ring[i - 1]![1]);
}

main();
