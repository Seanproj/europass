import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './cache.ts';

/** tokens.css 라이트 테마(:root 첫 블록)의 hex 값 */
export function lightToken(name: string): string {
  const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
  const light = css.slice(0, css.indexOf('@media'));
  const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(light);
  if (!m) throw new Error(`토큰 ${name}을 찾지 못함`);
  return m[1]!;
}
