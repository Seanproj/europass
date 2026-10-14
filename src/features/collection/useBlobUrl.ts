// Blob마다 object URL을 하나만 만들어 재사용한다. 사진 수가 방문당 10장으로 제한돼 있어
// 해제하지 않아도 부담이 적고, StrictMode의 이중 마운트에서도 끊기지 않는다
const cache = new WeakMap<Blob, string>();

export function useBlobUrl(blob: Blob | undefined): string | undefined {
  if (!blob) return undefined;
  let url = cache.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    cache.set(blob, url);
  }
  return url;
}
