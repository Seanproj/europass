import { hash32 } from '../../components/Stamp/stampMath';
import { getCity } from '../../data/cities';
import type { City } from '../../data/types';
import { visitRank, visitsByCity } from '../../db/selectors';
import type { Visit } from '../../db/types';
import { mulberry32 } from '../../lib/canvas';

/** 여권 한 페이지에 찍는 도장 수 */
export const PER_PAGE = 6;
/** 페이지 좌표: 가로 100 × 세로 PAGE_H (여권 비율) */
export const PAGE_H = 130;
/** 도장 지름 (페이지 가로 대비) */
export const STAMP_W = 38;

export interface BookStamp {
  visit: Visit;
  city: City;
  /** 이 도시의 몇 번째 방문인지 (날짜순) */
  nth: number;
  /** 도장 가운데 (페이지 좌표) */
  x: number;
  y: number;
}

export interface BookPage {
  year: number;
  /** 한 해가 여러 페이지면 몇 번째 장인지 (1부터) */
  part: number;
  parts: number;
  stamps: BookStamp[];
}

/**
 * 연도별 여권 페이지: 그해 방문을 날짜순으로 PER_PAGE개씩 한 장에 찍는다 (오래된 해가 앞).
 * 도장은 날짜순으로 2열 × 3행 자리에 찍고 방문 id로 조금 비껴 놓는다 — 다시 열어도 같은 자리
 */
export function bookPages(visits: Visit[]): BookPage[] {
  const byCity = visitsByCity(visits);
  const sorted = [...visits]
    .filter((v) => getCity(v.cityId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const byYear = new Map<number, Visit[]>();
  for (const v of sorted) {
    const y = Number(v.date.slice(0, 4));
    (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(v);
  }
  const pages: BookPage[] = [];
  for (const [year, list] of byYear) {
    const parts = Math.ceil(list.length / PER_PAGE);
    for (let p = 0; p < parts; p++) {
      const chunk = list.slice(p * PER_PAGE, (p + 1) * PER_PAGE);
      const placed: BookStamp[] = [];
      for (const [slot, visit] of chunk.entries()) {
        const { x, y } = spot(visit.id, slot);
        placed.push({
          visit,
          city: getCity(visit.cityId)!,
          nth: visitRank(byCity.get(visit.cityId) ?? [visit], visit),
          x,
          y,
        });
      }
      pages.push({ year, part: p + 1, parts, stamps: placed });
    }
  }
  return pages;
}

/** 2열 × 3행 자리. 날짜순으로 왼쪽 위부터 채우고, 방문 id로 조금씩 비껴 찍는다 (조금 겹치는 건 진짜 여권처럼 허용) */
function spot(id: string, slot: number): { x: number; y: number } {
  const rand = mulberry32(hash32(`book:${id}`));
  const r = STAMP_W / 2;
  const col = slot % 2;
  const row = Math.floor(slot / 2);
  const top = 24;
  const rowH = (PAGE_H - top - 4) / 3;
  const x = 27 + col * 46 + (rand() - 0.5) * 12;
  const y = top + rowH * (row + 0.5) + (rand() - 0.5) * 10;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    x: Math.round(clamp(x, r + 1, 100 - r - 1) * 10) / 10,
    y: Math.round(clamp(y, top + r - 4, PAGE_H - r - 1) * 10) / 10,
  };
}
