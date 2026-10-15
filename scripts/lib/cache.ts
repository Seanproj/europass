import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE_DIR = join(ROOT, 'data', '.cache');

const USER_AGENT = 'euro-passport-data-build/1.0 (https://github.com/seanproj/europass)';

/** 원천 파일을 data/.cache에 받아 두고 재사용한다 */
export async function cachedDownload(url: string, fileName: string): Promise<Buffer> {
  const path = join(CACHE_DIR, fileName);
  if (existsSync(path)) return readFileSync(path);
  console.log(`다운로드: ${url}`);
  const res = await fetchWithHint(url);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path, buf);
  return buf;
}

export async function fetchWithHint(
  url: string,
  init: RequestInit = {},
  { allowStatus = [] as number[] } = {},
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init.headers } });
  } catch (err) {
    const host = new URL(url).host;
    throw new Error(
      `${host}에 접속하지 못했습니다. 네트워크 정책에서 이 호스트가 막혀 있는지 확인하세요.` +
        ' (프록시 환경이면 NODE_USE_ENV_PROXY=1 필요)',
      { cause: err },
    );
  }
  if (!res.ok && !allowStatus.includes(res.status)) throw new Error(`${url} → HTTP ${res.status}`);
  return res;
}

/** 배열은 한 줄에 항목 하나씩 써서 diff를 읽기 쉽게 */
export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const text = Array.isArray(data)
    ? `[\n${data.map((d) => JSON.stringify(d)).join(',\n')}\n]`
    : JSON.stringify(data, null, 1);
  writeFileSync(path, text + '\n');
}
