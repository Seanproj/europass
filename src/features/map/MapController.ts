import type { GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl';
import { MapLibreMap } from './maplibre';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { CITIES, getCity } from '../../data/cities';
import type { Bbox, City, Region } from '../../data/types';
import { CITY_DOT_LAYERS, CITY_SOURCE, HOME_ICON, cityLayers, citySourceData } from './cities/layers';
import { renderHomeIcon } from './cities/homeIcon';
import { FogLayer, type Hole } from './fog/FogLayer';
import { drawLenses, type LensItem } from './lens/drawLenses';
import { LensSnapshotter, maskLens, type LensResult } from './lens/snapshots';
import {
  PUZZLE_REGIONS_SOURCE,
  PUZZLE_SOURCE,
  emptyFilter,
  paintedFilter,
  puzzleLayers,
} from './puzzle/layers';
import {
  countryProgress,
  newlyCompleted,
  paintedRegions,
  puzzleSourceData,
  type CountryProgress,
  type FlagCollection,
} from './puzzle/puzzle';
import { holeRadiusPx, lensOpacity, lensRadius, openProgress } from './radius';
import { ATTRIBUTION, LOCAL_IDEOGRAPH_FONT, fallbackStyle, isBoundaryLayer, themeStyle } from './style';
import type { Circle } from './tags/collision';
import type { MapTokens } from './tokens';

/** 첫 화면: 유럽 전체. 세로 화면은 너비가 기준이 되므로 남쪽을 더 넣어 시트 위로 유럽이 오게 */
export function europeBounds(portrait: boolean): LngLatBoundsLike {
  return portrait
    ? [
        [-10, 36],
        [30, 62],
      ]
    : [
        [-11, 35],
        [32, 70],
      ];
}
/** 유럽 밖으로는 못 나가게 */
const MAX_BOUNDS: LngLatBoundsLike = [
  [-45, 22],
  [65, 78],
];

export interface MapData {
  regions: Region[];
  bboxes: Record<string, Bbox>;
  flag: FlagCollection;
}

export type MapSelection = { kind: 'city'; id: string } | { kind: 'country'; code: string };

export interface FrameInfo {
  zoom: number;
  lenses: Circle[];
}

interface Options {
  container: HTMLElement;
  overlay: HTMLCanvasElement;
  base: StyleSpecification | null;
  data: MapData;
  tokens: MapTokens;
  onSelect: (s: MapSelection) => void;
  onFrame: (f: FrameInfo) => void;
}

const APPEAR_MS = 400;
const FLASH_MS = 900;

/**
 * 지도 한 개를 만들고 안개·국기 퍼즐·렌즈·도시 마커를 관리한다.
 * React는 방문 기록과 테마가 바뀔 때만 set*을 부르고, 매 프레임 일은 여기서 한다.
 */
export class MapController {
  readonly map: MapLibreMap;
  private tokens: MapTokens;
  private visits = new Map<string, number>();
  private visited: City[] = [];
  private homeId: string | undefined;
  private painted = new Set<string>();
  private progress = new Map<string, CountryProgress>();
  private openedAt = new Map<string, number>();
  private initialized = false;
  private featureIdsByRegion = new Map<string, number[]>();
  private lensSources = new Map<string, LensResult>();
  private lensMasks = new Map<string, HTMLCanvasElement>();
  private lastLenses: { cityId: string; c: Circle }[] = [];
  private snapshotter: LensSnapshotter;
  private destroyed = false;

  constructor(private opts: Options) {
    this.tokens = opts.tokens;
    opts.data.flag.features.forEach((f, i) => {
      const list = this.featureIdsByRegion.get(f.properties.regionId) ?? [];
      list.push(i);
      this.featureIdsByRegion.set(f.properties.regionId, list);
    });

    this.map = new MapLibreMap({
      container: opts.container,
      style: this.styleFor(this.tokens),
      bounds: europeBounds(opts.container.clientHeight > opts.container.clientWidth),
      fitBoundsOptions: { padding: { top: 70, bottom: 170, left: 16, right: 16 } },
      maxBounds: MAX_BOUNDS,
      minZoom: 1.5,
      maxZoom: 16,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      localIdeographFontFamily: LOCAL_IDEOGRAPH_FONT,
      attributionControl: { compact: true, customAttribution: opts.base ? undefined : ATTRIBUTION },
    });
    // 출처 표기는 접힌 (i) 버튼으로 시작 (MapLibre는 처음에 펼쳐 둔다)
    this.map.once('load', () => {
      opts.container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    });
    this.map.touchZoomRotate.disableRotation();
    this.map.keyboard.disableRotation();

    this.map.on('style.load', () => void this.install());
    this.map.on('render', () => this.frame());
    this.map.on('click', (e) => this.handleClick(e.point));
    this.map.on('mousemove', (e) => {
      this.map.getCanvas().style.cursor = this.hitTest(e.point) ? 'pointer' : '';
    });

    this.snapshotter = new LensSnapshotter(
      () => ({
        style: opts.base ? themeStyle(opts.base, this.tokens, true) : null,
        theme: this.tokens.theme,
      }),
      (cityId, theme, result) => {
        if (this.destroyed || theme !== this.tokens.theme) return;
        this.lensSources.set(cityId, result);
        this.map.triggerRepaint();
      },
    );
  }

  destroy() {
    this.destroyed = true;
    this.snapshotter.destroy();
    this.map.remove();
  }

  // ── 외부에서 부르는 갱신 ──────────────────────────────

  setVisits(counts: Map<string, number>) {
    const now = performance.now();
    if (this.initialized) {
      for (const id of counts.keys()) if (!this.visits.has(id)) this.openedAt.set(id, now);
    }
    this.visits = counts;
    this.visited = [...counts.keys()].map(getCity).filter((c): c is City => !!c);

    const prevPainted = this.painted;
    const prevProgress = this.progress;
    this.painted = paintedRegions(counts.keys(), getCity);
    this.progress = countryProgress(this.painted, this.opts.data.regions);
    if (this.initialized) {
      const fresh = [...this.painted].filter((r) => !prevPainted.has(r));
      this.animateAppear(fresh);
      for (const code of newlyCompleted(prevProgress, this.progress)) this.animateFlash(code);
    }
    this.initialized = true;
    for (const c of this.visited) this.snapshotter.request({ cityId: c.id, lon: c.lon, lat: c.lat });
    this.applyData();
  }

  setHome(id: string | undefined) {
    this.homeId = id;
    this.applyData();
  }

  setTokens(tokens: MapTokens) {
    const themeChanged = tokens.theme !== this.tokens.theme;
    this.tokens = tokens;
    this.lensMasks.clear();
    if (themeChanged) {
      this.lensSources.clear();
      for (const c of this.visited) this.snapshotter.request({ cityId: c.id, lon: c.lon, lat: c.lat });
    }
    // 스타일을 통째로 바꾸고 style.load에서 우리 레이어를 다시 얹는다
    this.map.setStyle(this.styleFor(tokens), { diff: false });
  }

  getProgress(): Map<string, CountryProgress> {
    return this.progress;
  }

  flyToCountry(code: string) {
    const bbox = this.opts.data.bboxes[code];
    if (!bbox) return;
    this.map.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: { top: 80, bottom: 260, left: 32, right: 32 }, maxZoom: 7.5, duration: 900 },
    );
  }

  flyToCity(id: string) {
    const c = getCity(id);
    if (c) this.map.flyTo({ center: [c.lon, c.lat], zoom: Math.max(this.map.getZoom(), 11), duration: 900 });
  }

  // ── 스타일과 레이어 ──────────────────────────────────

  private styleFor(t: MapTokens): StyleSpecification {
    return this.opts.base ? themeStyle(this.opts.base, t) : fallbackStyle(t);
  }

  private async install() {
    const map = this.map;
    const t = this.tokens;
    const { regions, flag } = this.opts.data;

    if (!this.opts.base) {
      // 타일 없이도 나라 모양은 보이게: 국기 퍼즐 조각을 합쳐 육지로 깐다
      map.addSource('fallback-land', { type: 'geojson', data: regionsGeoJSON(regions) });
      map.addLayer({
        id: 'fallback-land',
        type: 'fill',
        source: 'fallback-land',
        paint: { 'fill-color': ['interpolate', ['linear'], ['zoom'], 5, t.land, 9, t.dBg] },
      });
    }

    map.addLayer(
      new FogLayer({
        fogColor: t.fog,
        cloudColor: t.fogCloud,
        holes: () => this.holes(),
      }),
    );

    map.addSource(PUZZLE_SOURCE, { type: 'geojson', data: puzzleSourceData(flag, t.flagBlack) as never });
    map.addSource(PUZZLE_REGIONS_SOURCE, { type: 'geojson', data: regionsGeoJSON(regions) });
    for (const layer of puzzleLayers(t)) map.addLayer(layer as never);

    // 나라 경계는 국기 퍼즐 위로
    for (const layer of map.getStyle().layers) if (isBoundaryLayer(layer as never)) map.moveLayer(layer.id);

    map.addSource(CITY_SOURCE, { type: 'geojson', data: citySourceData(CITIES, this.visits, this.homeId) });
    try {
      const icon = await renderHomeIcon({ fg: t.tagText, bg: t.accent }, 2);
      if (!map.hasImage(HOME_ICON)) map.addImage(HOME_ICON, icon, { pixelRatio: 2 });
    } catch {
      // 아이콘이 없으면 홈 도시는 일반 점으로 보인다
    }
    for (const layer of cityLayers(t)) map.addLayer(layer as never);
    this.applyData();
  }

  /** 방문 기록이 바뀌면 필터와 소스 갱신 */
  private applyData() {
    const map = this.map;
    if (!map.getSource(CITY_SOURCE)) return;
    const painted = [...this.painted];
    const countries = [...this.progress].filter(([, p]) => p.painted > 0).map(([code]) => code);
    for (const id of ['puzzle-fill', 'puzzle-flash', 'puzzle-line-painted'])
      map.setFilter(id, paintedFilter(painted));
    map.setFilter('puzzle-line-empty', emptyFilter(painted, countries));
    (map.getSource(CITY_SOURCE) as GeoJSONSource).setData(citySourceData(CITIES, this.visits, this.homeId));
    map.triggerRepaint();
  }

  // ── 매 프레임 ───────────────────────────────────────

  private openScale(cityId: string, now: number): number {
    const t0 = this.openedAt.get(cityId);
    if (t0 === undefined) return 1;
    const p = openProgress(now - t0);
    if (p >= 1) this.openedAt.delete(cityId);
    return p;
  }

  private holes(): Hole[] {
    const map = this.map;
    const zoom = map.getZoom();
    const { clientWidth: w, clientHeight: h } = map.getCanvas();
    const now = performance.now();
    const out: Hole[] = [];
    for (const c of this.visited) {
      const p = map.project([c.lon, c.lat]);
      const r = holeRadiusPx(c.tier, this.visits.get(c.id) ?? 1, c.lat, zoom) * this.openScale(c.id, now);
      if (p.x + r < 0 || p.y + r < 0 || p.x - r > w || p.y - r > h) continue;
      out.push({ x: p.x, y: p.y, r });
    }
    return out;
  }

  private frame() {
    const map = this.map;
    const canvas = this.opts.overlay;
    const { clientWidth: w, clientHeight: h } = map.getCanvas();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const zoom = map.getZoom();
    const alpha = lensOpacity(zoom);
    const now = performance.now();
    const items: LensItem[] = [];
    const t = this.tokens;
    if (alpha > 0) {
      for (const c of this.visited) {
        const p = map.project([c.lon, c.lat]);
        const visits = this.visits.get(c.id) ?? 1;
        const base = lensRadius(c.tier, visits);
        const r = base * this.openScale(c.id, now);
        if (p.x + r < 0 || p.y + r < 0 || p.x - r > w || p.y - r > h + 40) continue;
        items.push({
          cityId: c.id,
          x: p.x,
          y: p.y,
          r,
          image: this.lensImage(c.id, base, dpr),
          name: c.name.ko,
          visits,
          home: c.id === this.homeId,
        });
      }
    }
    const circles = drawLenses(ctx, items, alpha, {
      bg: t.tagBg,
      text: t.tagText,
      badge: t.tagBadge,
      home: t.accent,
      font: t.font,
    });
    this.lastLenses = items.map((it, i) => ({ cityId: it.cityId, c: circles[i]! }));
    this.opts.onFrame({ zoom, lenses: circles });

    // 구멍이 열리는 중이면 다음 프레임도 그린다
    if (this.openedAt.size > 0) map.triggerRepaint();
  }

  private lensImage(cityId: string, radius: number, dpr: number): HTMLCanvasElement | null {
    if (!this.lensSources.has(cityId)) return null;
    const key = `${cityId}@${radius}@${dpr}`;
    let mask = this.lensMasks.get(key);
    if (!mask) {
      mask = maskLens(this.lensSources.get(cityId)!, radius, dpr, {
        bg: this.tokens.dBg,
        dot: this.tokens.accent,
      });
      this.lensMasks.set(key, mask);
    }
    return mask;
  }

  // ── 애니메이션 (feature-state) ──────────────────────

  private animate(ids: number[], key: 'appear' | 'flash', ms: number, value: (t: number) => number) {
    if (ids.length === 0) return;
    const start = performance.now();
    const step = () => {
      if (this.destroyed || !this.map.getSource(PUZZLE_SOURCE)) return;
      const t = Math.min((performance.now() - start) / ms, 1);
      for (const id of ids) this.map.setFeatureState({ source: PUZZLE_SOURCE, id }, { [key]: value(t) });
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  /** 새 조각: 불투명도 0 → 1 (400ms) */
  private animateAppear(regionIds: string[]) {
    const ids = regionIds.flatMap((r) => this.featureIdsByRegion.get(r) ?? []);
    this.animate(ids, 'appear', APPEAR_MS, (t) => 1 - (1 - t) ** 3);
  }

  /** 나라 완성: 국기 전체가 한 번 반짝인다 */
  private animateFlash(code: string) {
    const ids = this.opts.data.regions
      .filter((r) => r.country === code)
      .flatMap((r) => this.featureIdsByRegion.get(r.id) ?? []);
    setTimeout(() => this.animate(ids, 'flash', FLASH_MS, (t) => Math.sin(Math.PI * t)), APPEAR_MS);
  }

  // ── 탭 ─────────────────────────────────────────────

  private hitTest(point: { x: number; y: number }): MapSelection | null {
    if (lensOpacity(this.map.getZoom()) > 0.3) {
      const lens = this.lastLenses.find(({ c }) => (point.x - c.x) ** 2 + (point.y - c.y) ** 2 <= c.r ** 2);
      if (lens) return { kind: 'city', id: lens.cityId };
    }
    const pad = 10;
    const layers = [...CITY_DOT_LAYERS, 'city-home'].filter((id) => this.map.getLayer(id));
    const hits = this.map.queryRenderedFeatures(
      [
        [point.x - pad, point.y - pad],
        [point.x + pad, point.y + pad],
      ],
      { layers },
    );
    const id = hits[0]?.properties?.id as string | undefined;
    return id ? { kind: 'city', id } : null;
  }

  private handleClick(point: { x: number; y: number }) {
    const hit = this.hitTest(point);
    if (hit) this.opts.onSelect(hit);
  }
}

function regionsGeoJSON(regions: Region[]) {
  return {
    type: 'FeatureCollection' as const,
    features: regions.map((r) => ({
      type: 'Feature' as const,
      properties: { regionId: r.id, country: r.country },
      geometry: { type: 'MultiPolygon' as const, coordinates: r.polygon },
    })),
  };
}
