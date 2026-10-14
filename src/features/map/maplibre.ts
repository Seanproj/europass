import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// MapLibre 워커 파일을 번들 자산으로 명시 (Vite 개발 서버의 사전 번들링에서는 상대 경로를 못 찾는다)
setWorkerUrl(workerUrl);

export { Map as MapLibreMap, MercatorCoordinate } from 'maplibre-gl';
