// 오프라인 지원: 앱 파일은 캐시 우선, 그 외(CDN·지도 데이터)는 네트워크 후 캐시
const CACHE = 'euro-passport-v1';
const APP_SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'assets/icon.svg',
  'js/app.js', 'js/cities.js', 'js/storage.js', 'js/stamp.js', 'js/badges.js',
  'vendor/d3.min.js', 'vendor/topojson-client.min.js', 'vendor/countries-50m.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
