import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PREFETCH_RADIUS_KM,
  PREFETCH_ZOOMS,
  loadPrefetchSetting,
  onUnmeteredNetwork,
  prefetchCityTiles,
  registerTileTemplates,
  savePrefetchSetting,
  tileUrl,
  tilesAround,
} from './prefetch';

describe('tilesAround', () => {
  it('프라하 z8은 1장, 줌이 오를수록 늘어난다', () => {
    const tiles = tilesAround(50.088, 14.4208, PREFETCH_RADIUS_KM, PREFETCH_ZOOMS);
    const at = (z: number) => tiles.filter((t) => t.z === z);
    expect(at(8)).toEqual([{ z: 8, x: 138, y: 86 }]);
    expect(at(13).length).toBeGreaterThan(at(10).length);
    // 너무 많이 받지 않는다 (도시 하나에 수십 장)
    expect(tiles.length).toBeLessThan(60);
    // z13 타일들은 프라하 타일(4424, 2774)을 포함
    expect(at(13)).toContainEqual({ z: 13, x: 4424, y: 2774 });
  });

  it('주소 틀 채우기', () => {
    expect(tileUrl('https://t/{z}/{x}/{y}.pbf', { z: 8, x: 1, y: 2 })).toBe('https://t/8/1/2.pbf');
  });
});

describe('onUnmeteredNetwork', () => {
  it('연결 종류를 알면 와이파이·유선만, 데이터 절약 모드는 안 받음', () => {
    expect(onUnmeteredNetwork({ type: 'wifi' })).toBe(true);
    expect(onUnmeteredNetwork({ type: 'ethernet' })).toBe(true);
    expect(onUnmeteredNetwork({ type: 'cellular' })).toBe(false);
    expect(onUnmeteredNetwork({ saveData: true })).toBe(false);
    expect(onUnmeteredNetwork({})).toBe(true);
  });
});

describe('prefetchCityTiles', () => {
  afterEach(() => {
    savePrefetchSetting(false);
    registerTileTemplates(null);
    vi.unstubAllGlobals();
  });

  it('설정이 꺼져 있으면 받지 않는다', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    registerTileTemplates(() => ['https://tiles.openfreemap.org/planet/x/{z}/{x}/{y}.pbf']);
    expect(loadPrefetchSetting()).toBe(false);
    expect(await prefetchCityTiles(50.088, 14.4208)).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('켜져 있으면 OpenFreeMap 타일만 받는다', async () => {
    const fetch = vi.fn<(url: string) => Promise<Response>>(() => Promise.resolve(new Response('')));
    vi.stubGlobal('fetch', fetch);
    savePrefetchSetting(true);
    registerTileTemplates(() => [
      'https://tiles.openfreemap.org/planet/x/{z}/{x}/{y}.pbf',
      'https://other/{z}/{x}/{y}',
    ]);
    const n = await prefetchCityTiles(50.088, 14.4208);
    expect(n).toBe(tilesAround(50.088, 14.4208, PREFETCH_RADIUS_KM, PREFETCH_ZOOMS).length);
    expect(fetch).toHaveBeenCalledTimes(n);
    expect(fetch.mock.calls.every(([u]) => String(u).startsWith('https://tiles.openfreemap.org/'))).toBe(
      true,
    );
  });
});
