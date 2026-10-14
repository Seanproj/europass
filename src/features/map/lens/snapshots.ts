import { MapLibreMap } from '../maplibre';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { db } from '../../../db/db';
import { lensCacheKey, type MapTheme } from './cacheKey';
import { LOCAL_IDEOGRAPH_FONT } from '../style';

/** 렌즈에 담을 상세 지도 줌 */
export const LENS_ZOOM = 13;
/** 스냅샷 크기 (CSS px). 렌즈 지름 최대 76px의 2배 이상 여유 */
const SNAPSHOT_PX = 192;
/** 타일이 끝내 안 오면 포기하는 시간 */
const IDLE_TIMEOUT_MS = 12_000;

export interface LensRequest {
  cityId: string;
  lon: number;
  lat: number;
}

/** null = 만들지 못함 (오프라인 등). 단색 렌즈로 대신 그린다 */
export type LensResult = ImageBitmap | null;

/**
 * 렌즈 스냅샷 생성기: 화면 밖 숨은 지도에서 도시 중심을 z13으로 찍어 Dexie에 저장한다.
 * 한 번에 하나씩 순서대로 만들고, 캐시가 있으면 지도를 띄우지 않는다.
 */
export class LensSnapshotter {
  private queue: LensRequest[] = [];
  private pending = new Set<string>();
  private running = false;
  private map?: MapLibreMap;
  private container?: HTMLDivElement;
  private mapTheme?: MapTheme;

  constructor(
    private getStyle: () => { style: StyleSpecification | null; theme: MapTheme },
    private onReady: (cityId: string, theme: MapTheme, result: LensResult) => void,
  ) {}

  request(req: LensRequest) {
    const { theme } = this.getStyle();
    const key = lensCacheKey(req.cityId, theme);
    if (this.pending.has(key)) return;
    this.pending.add(key);
    this.queue.push(req);
    void this.pump();
  }

  destroy() {
    this.queue = [];
    this.map?.remove();
    this.container?.remove();
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const req = this.queue.shift()!;
        const { style, theme } = this.getStyle();
        const key = lensCacheKey(req.cityId, theme);
        let result: LensResult = null;
        try {
          result = await this.fromCache(key);
          if (!result && style) {
            const blob = await this.capture(req, style, theme);
            if (blob) {
              await db.lensCache.put({ key, blob, createdAt: Date.now() }).catch(() => undefined);
              result = await createImageBitmap(blob);
            }
          }
        } catch {
          result = null;
        }
        this.pending.delete(key);
        this.onReady(req.cityId, theme, result);
      }
    } finally {
      this.running = false;
    }
  }

  private async fromCache(key: string): Promise<LensResult> {
    const row = await db.lensCache.get(key).catch(() => undefined);
    return row ? createImageBitmap(row.blob).catch(() => null) : null;
  }

  private async capture(req: LensRequest, style: StyleSpecification, theme: MapTheme): Promise<Blob | null> {
    const map = this.ensureMap(style);
    if (this.mapTheme !== theme) {
      map.setStyle(style);
      this.mapTheme = theme;
    }
    map.jumpTo({ center: [req.lon, req.lat], zoom: LENS_ZOOM });
    const ok = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), IDLE_TIMEOUT_MS);
      map.once('idle', () => {
        clearTimeout(timer);
        resolve(true);
      });
      map.triggerRepaint();
    });
    if (!ok || !map.areTilesLoaded()) return null;
    return new Promise((resolve) => map.getCanvas().toBlob((b) => resolve(b), 'image/webp', 0.86));
  }

  private ensureMap(style: StyleSpecification): MapLibreMap {
    if (this.map) return this.map;
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: `${SNAPSHOT_PX}px`,
      height: `${SNAPSHOT_PX}px`,
      pointerEvents: 'none',
    });
    document.body.appendChild(el);
    this.container = el;
    this.map = new MapLibreMap({
      container: el,
      style,
      center: [0, 0],
      zoom: LENS_ZOOM,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      localIdeographFontFamily: LOCAL_IDEOGRAPH_FONT,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    this.mapTheme = this.getStyle().theme;
    return this.map;
  }
}

/** 스냅샷을 원형으로 자르고 가장자리를 번지게 한 렌즈 이미지 (실패 시 --d-bg 단색 + 도시 점) */
export function maskLens(
  source: LensResult,
  radius: number,
  dpr: number,
  colors: { bg: string; dot: string },
): HTMLCanvasElement {
  const size = Math.ceil(radius * 2 * dpr);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  if (source) {
    // 가운데를 정사각형으로 잘라 렌즈 크기에 맞춤
    const s = Math.min(source.width, source.height);
    ctx.drawImage(source, (source.width - s) / 2, (source.height - s) / 2, s, s, 0, 0, size, size);
  } else {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.fillStyle = colors.dot;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 3.5 * dpr, 0, Math.PI * 2);
  ctx.fill();
  // 방사형 마스크: 반지름 72%까지 선명, 바깥은 투명하게
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.72, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}
