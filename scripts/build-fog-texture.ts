/**
 * 안개 구름 텍스처 생성: 이음새 없이 타일링되는 프랙탈 노이즈 PNG (흰색 + 알파)
 *   npx tsx scripts/build-fog-texture.ts
 * 출력: src/features/map/fog/clouds.png (커밋. 색은 앱에서 --fog-cloud로 입힌다)
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { ROOT } from './lib/cache';

const SIZE = 512;
const SEED = 20261014;

// 재현 가능한 의사난수 (mulberry32)
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 주기 period로 반복되는 격자 값 노이즈 (주기가 SIZE를 나누므로 가장자리가 이어진다) */
function periodicNoise(period: number, random: () => number) {
  const grid = Array.from({ length: period * period }, random);
  const at = (x: number, y: number) =>
    grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)]!;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (u: number, v: number) => {
    const x = u * period;
    const y = v * period;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const sx = smooth(x - x0);
    const sy = smooth(y - y0);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

function main() {
  const random = rng(SEED);
  const octaves = [4, 8, 16, 32, 64].map((p, i) => ({ fn: periodicNoise(p, random), amp: 0.5 ** i }));
  const total = octaves.reduce((s, o) => s + o.amp, 0);

  const rows: Buffer[] = [];
  for (let y = 0; y < SIZE; y++) {
    const row = Buffer.alloc(1 + SIZE * 2);
    row[0] = 0; // PNG 필터 없음
    for (let x = 0; x < SIZE; x++) {
      const n = octaves.reduce((s, o) => s + o.fn(x / SIZE, y / SIZE) * o.amp, 0) / total;
      // 구름 덩어리가 생기도록 대비를 키우고 0.2~0.95 알파로
      const c = Math.min(1, Math.max(0, (n - 0.32) / 0.42));
      const alpha = 0.2 + 0.75 * c * c * (3 - 2 * c);
      row[1 + x * 2] = 255;
      row[2 + x * 2] = Math.round(alpha * 255);
    }
    rows.push(row);
  }
  const png = encodePng(SIZE, SIZE, Buffer.concat(rows));
  const out = join(ROOT, 'src', 'features', 'map', 'fog', 'clouds.png');
  writeFileSync(out, png);
  console.log(`${out} (${png.length} bytes)`);
}

/** 회색조 + 알파(색 형식 4) 8비트 PNG */
function encodePng(w: number, h: number, raw: Buffer): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 4;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

main();
