/**
 * 앱 번들에 싣는 도시 필드만 남긴다: geonameid는 빼고(큐레이션 CSV와 캐시에 있음), capital은 참일 때만.
 * build-cities가 출력할 때 쓰고, 이미 있는 cities.json에도 그대로 적용할 수 있다 (npm run data:slim)
 */
export function slimCity<T extends { capital?: boolean; geonameid?: unknown }>(c: T) {
  const { geonameid: _drop, capital, ...rest } = c;
  void _drop;
  return { ...rest, ...(capital ? { capital: true as const } : {}) };
}
