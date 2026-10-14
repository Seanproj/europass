/**
 * 앱 아이콘 세트 생성: 디자인 토큰(tokens.css 라이트 테마)의 색으로 그린 도장 모양
 *   npm run icons
 * 출력 (커밋): public/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png, public/icon.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/cache';
import { lightToken } from './lib/tokens';

const BG = lightToken('--bg');
const ACCENT = lightToken('--accent');

/**
 * 512 기준 도장: 이중 원 테두리 + 글자 줄을 뜻하는 막대 (글꼴 없이 도형만)
 * scale: 마스커블 아이콘은 안전 영역(가운데 80%) 안에 들어가게 줄인다
 */
function stamp(scale: number): string {
  return `<g transform="translate(256 256) rotate(-8) scale(${scale}) translate(-256 -256)" fill="none" stroke="${ACCENT}">
    <circle cx="256" cy="256" r="176" stroke-width="22"/>
    <circle cx="256" cy="256" r="148" stroke-width="7"/>
    <g fill="${ACCENT}" stroke="none">
      <rect x="196" y="176" width="120" height="16" rx="8"/>
      <rect x="146" y="214" width="220" height="40" rx="12"/>
      <rect x="176" y="276" width="160" height="18" rx="9"/>
      <rect x="196" y="318" width="120" height="14" rx="7"/>
    </g>
  </g>`;
}

const svg = ({ rounded, scale }: { rounded: boolean; scale: number }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="${BG}"/>
  ${stamp(scale)}
</svg>`;

const out = join(ROOT, 'public/icons');
mkdirSync(out, { recursive: true });

const png = (s: string, size: number, file: string) =>
  sharp(Buffer.from(s)).resize(size, size).png({ compressionLevel: 9 }).toFile(join(out, file));

await Promise.all([
  png(svg({ rounded: true, scale: 1 }), 192, 'icon-192.png'),
  png(svg({ rounded: true, scale: 1 }), 512, 'icon-512.png'),
  // 마스커블: 바탕을 꽉 채우고 도장은 안전 영역 안으로
  png(svg({ rounded: false, scale: 0.78 }), 512, 'maskable-512.png'),
  // iOS가 모서리를 둥글게 깎으므로 꽉 찬 사각형
  png(svg({ rounded: false, scale: 0.92 }), 180, 'apple-touch-icon.png'),
]);
writeFileSync(join(ROOT, 'public/icon.svg'), svg({ rounded: true, scale: 1 }) + '\n');
console.log(`아이콘 생성: bg ${BG}, accent ${ACCENT}`);
