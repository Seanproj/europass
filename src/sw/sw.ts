/// <reference lib="webworker" />
/**
 * v1 서비스 워커 (vite-plugin-pwa injectManifest). 예전 v0가 루트에 등록한 sw.js와 같은 주소라
 * 기존 등록도 이것으로 교체된다.
 * - 앱 셸: 빌드 결과를 미리 캐시 (한글 글꼴 조각은 쓰일 때 캐시)
 * - 지도 타일: stale-while-revalidate, 최대 2000개 (오래 안 쓴 것부터 지움)
 * - /v0/, /docs/는 건드리지 않는다 (v0는 자기 서비스 워커가 있다)
 */
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { TILE_CACHE, TILE_HOST, TILE_MAX_ENTRIES } from './config';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 앱 안의 주소(?city= 등)는 모두 index.html로. v0와 디자인 문서는 제외
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/\/v0(\/|$)/, /\/docs\//],
  }),
);

registerRoute(
  ({ url }) => url.host === TILE_HOST,
  new StaleWhileRevalidate({
    cacheName: TILE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: TILE_MAX_ENTRIES, purgeOnQuotaError: true }),
    ],
  }),
);

// Pretendard 동적 서브셋: 파일 이름에 해시가 있어 한 번 받으면 바뀌지 않는다
registerRoute(
  ({ request, url }) => request.destination === 'font' && url.origin === self.location.origin,
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 150, purgeOnQuotaError: true })],
  }),
);

// "업데이트 · 새로고침"을 누르면 새 버전으로 바로 넘어간다
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});
