// 도시별 여권 도장 SVG 생성기
// 도시 id로 시드를 만들어 모양·색·각도가 도시마다 다르지만 항상 같게 나오도록 함
import { COUNTRIES } from './cities.js';

const INKS = ['#b3261e', '#1f4e8c', '#2e6b3a', '#6b2e83', '#0f6b6b', '#8a4b10', '#a0204f'];
const SHAPES = ['circle', 'rect', 'oval', 'hex', 'circle', 'rect'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function stampStyle(city) {
  const h = hash(city.id);
  return {
    ink: INKS[h % INKS.length],
    shape: SHAPES[(h >>> 3) % SHAPES.length],
    rotate: ((h >>> 7) % 25) - 12,
  };
}

function formatStampDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][+m - 1];
  return `${d} ${mon} ${y}`;
}

// opts.date: 'YYYY-MM-DD', opts.ghost: 미방문 흐린 도장, opts.rough: 잉크 번짐 필터
export function stampSVG(city, { date = '', ghost = false, rough = true, size = 160 } = {}) {
  const { ink, shape, rotate } = stampStyle(city);
  const color = ghost ? '#b9ad94' : ink;
  const country = COUNTRIES[city.country];
  const name = esc(city.en.toUpperCase());
  const dateText = esc(formatStampDate(date));
  const fid = `rough-${city.id}`;
  const filter = rough && !ghost ? `filter="url(#${fid})"` : '';
  const dash = ghost ? 'stroke-dasharray="4 4"' : '';

  let frame = '';
  let label = '';
  if (shape === 'circle' || shape === 'oval') {
    const rx = shape === 'oval' ? 74 : 66;
    const ry = shape === 'oval' ? 54 : 66;
    frame = `
      <ellipse cx="80" cy="80" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="4" ${dash}/>
      <ellipse cx="80" cy="80" rx="${rx - 9}" ry="${ry - 9}" fill="none" stroke="${color}" stroke-width="1.5" ${dash}/>`;
    const r = ry - 17;
    label = `
      <defs><path id="arc-${city.id}" d="M ${80 - r},80 A ${r},${r} 0 0 1 ${80 + r},80"/></defs>
      <text font-family="'Courier New', monospace" font-weight="700" font-size="${name.length > 9 ? 11 : 13}" letter-spacing="2" fill="${color}">
        <textPath href="#arc-${city.id}" startOffset="50%" text-anchor="middle">${name}</textPath>
      </text>
      <text x="80" y="${80 + ry - 22}" text-anchor="middle" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="${color}">${dateText || city.country}</text>`;
  } else if (shape === 'hex') {
    frame = `
      <polygon points="80,10 142,45 142,115 80,150 18,115 18,45" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" ${dash}/>
      <polygon points="80,22 131,51 131,109 80,138 29,109 29,51" fill="none" stroke="${color}" stroke-width="1.5" ${dash}/>`;
    label = `
      <text x="80" y="54" text-anchor="middle" font-family="'Courier New', monospace" font-weight="700" font-size="${name.length > 9 ? 10 : 12}" letter-spacing="1.5" fill="${color}">${name}</text>
      <text x="80" y="122" text-anchor="middle" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="${color}">${dateText || city.country}</text>`;
  } else {
    frame = `
      <rect x="14" y="26" width="132" height="108" rx="10" fill="none" stroke="${color}" stroke-width="4" ${dash}/>
      <rect x="22" y="34" width="116" height="92" rx="5" fill="none" stroke="${color}" stroke-width="1.5" ${dash}/>
      <line x1="22" y1="56" x2="138" y2="56" stroke="${color}" stroke-width="1.5"/>`;
    label = `
      <text x="80" y="50" text-anchor="middle" font-family="'Courier New', monospace" font-weight="700" font-size="${name.length > 9 ? 10 : 12}" letter-spacing="1.5" fill="${color}">${name}</text>
      <text x="80" y="118" text-anchor="middle" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="${color}">${dateText || 'ARRIVED'}</text>`;
  }

  const flagPos = { circle: [122, 86], oval: [128, 88], hex: [117, 86], rect: [40, 90] }[shape];
  const center = ghost
    ? `<text x="80" y="92" text-anchor="middle" font-size="30" fill="${color}" font-family="sans-serif">?</text>`
    : `<text x="80" y="95" text-anchor="middle" font-size="34">${city.emoji}</text>
       <text x="${flagPos[0]}" y="${flagPos[1]}" text-anchor="middle" font-size="12">${country ? country.flag : ''}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="${size}" height="${size}" role="img" aria-label="${esc(city.ko)} 도장">
    <defs>
      <filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${hash(city.id) % 100}" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2"/>
        <feComponentTransfer><feFuncA type="table" tableValues="0 0.9 0.85"/></feComponentTransfer>
      </filter>
    </defs>
    <g transform="rotate(${ghost ? 0 : rotate} 80 80)" ${filter} opacity="${ghost ? 0.7 : 0.92}">
      ${frame}${label}${center}
    </g>
  </svg>`;
}
