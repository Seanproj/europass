import type { Page } from '@playwright/test';

export type Row = {
  id: string;
  cityId: string;
  date: string;
  note: string;
  photos: Blob[];
  createdAt: number;
  updatedAt: number;
};

/** 개발 서버가 노출하는 지도·DB (src/features/map/MapView.tsx) */
export type DevWindow = Window & {
  __map: { loaded(): boolean; getCenter(): { lng: number; lat: number }; getZoom(): number };
  __db: {
    visits: {
      bulkPut(v: Row[]): Promise<unknown>;
      count(): Promise<number>;
      get(id: string): Promise<Row | undefined>;
      where(k: string): { equals(v: string): { count(): Promise<number> } };
    };
    settings: { put(r: { key: string; value: unknown }): Promise<unknown> };
  };
};

export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });
}

/** 프로필 + 방문 기록 몇 건 (프라하 2번, 룩셈부르크 3곳, 트롬쇠) */
export async function seed(page: Page) {
  await page.evaluate(async () => {
    const w = window as unknown as DevWindow;
    const row = (id: string, cityId: string, date: string, note = ''): Row => ({
      id,
      cityId,
      date,
      note,
      photos: [],
      createdAt: 1,
      updatedAt: 1,
    });
    await w.__db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    await w.__db.visits.bulkPut([
      row('p1', 'cz-prague', '2026-03-08', '카를교 야경'),
      row('p2', 'cz-prague', '2026-09-20'),
      row('l1', 'lu-luxembourg', '2026-07-01'),
      row('l2', 'lu-echternach', '2026-07-02'),
      row('l3', 'lu-vianden', '2026-07-03'),
      row('t1', 'no-tromso', '2026-01-15'),
    ]);
  });
}

/** 타일 서버를 막아 지도를 최소 스타일(배경 + 국기 퍼즐)로 고정 — 시각 회귀용 */
export async function blockTiles(page: Page) {
  await page.route(/tiles\.openfreemap\.org/, (r) => r.abort());
}

/** 테스트용 JPEG (브라우저 캔버스로 만든다) */
export async function makeJpeg(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c9e0b5';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#d8443a';
    ctx.fillRect(120, 80, 160, 140);
    return c.toDataURL('image/jpeg', 0.9);
  });
  return Buffer.from(dataUrl.split(',')[1]!, 'base64');
}

/** 검색창 열고 이름으로 찾아 첫 결과로 체크인 */
export async function checkInBySearch(page: Page, query: string) {
  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  await page.getByRole('searchbox', { name: '도시 검색' }).fill(query);
  await page.getByRole('list', { name: '검색 결과' }).getByRole('button').first().click();
}
