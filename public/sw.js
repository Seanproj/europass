// v0가 루트에 등록했던 서비스 워커를 정리하는 kill-switch.
// v0의 캐시가 v1 화면을 가리지 않도록 스스로 해제한다. Phase 8에서 v1용 서비스 워커로 교체.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.navigate(c.url));
    })(),
  );
});
