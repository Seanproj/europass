import { expect, test, type Page } from '@playwright/test';

type Row = {
  id: string;
  cityId: string;
  date: string;
  note: string;
  photos: Blob[];
  createdAt: number;
  updatedAt: number;
};
type DevWindow = Window & {
  __map: { loaded(): boolean; getCenter(): { lng: number; lat: number }; getZoom(): number };
  __db: {
    visits: { bulkPut(v: Row[]): Promise<unknown> };
    settings: { put(r: { key: string; value: unknown }): Promise<unknown> };
  };
};

async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });
}

async function seed(page: Page) {
  await page.evaluate(async () => {
    const w = window as unknown as DevWindow;
    const row = (id: string, cityId: string, date: string): Row => ({
      id,
      cityId,
      date,
      note: '',
      photos: [],
      createdAt: 1,
      updatedAt: 1,
    });
    await w.__db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    await w.__db.visits.bulkPut([
      row('p1', 'cz-prague', '2026-03-08'),
      row('p2', 'cz-prague', '2026-09-20'),
      row('l1', 'lu-luxembourg', '2026-07-01'),
      row('l2', 'lu-echternach', '2026-07-02'),
      row('l3', 'lu-vianden', '2026-07-03'),
      row('t1', 'no-tromso', '2026-01-15'),
    ]);
  });
}

/** 미리보기 이미지의 실제 크기 */
const previewSize = (page: Page) =>
  page.locator('dialog[open] img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);

test('공유 카드: 피드 · 스토리 · 국가 · 도시 카드가 만들어지고, 지도 카메라는 그대로', async ({ page }) => {
  await openApp(page);
  await seed(page);
  const camera = () =>
    page.evaluate(() => {
      const m = (window as unknown as DevWindow).__map;
      const c = m.getCenter();
      return [c.lng.toFixed(3), c.lat.toFixed(3), m.getZoom().toFixed(2)];
    });
  const before = await camera();

  await page.getByRole('button', { name: '프로필' }).click();
  await page.getByRole('button', { name: '공유', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '공유 카드' });
  await expect(dialog.getByRole('img', { name: '공유 카드 미리보기' })).toBeVisible({ timeout: 30_000 });
  expect(await previewSize(page)).toEqual([1080, 1350]);
  await dialog.getByRole('radio', { name: '스토리 9:16' }).click();
  await expect.poll(() => previewSize(page), { timeout: 30_000 }).toEqual([1080, 1920]);

  // 저장(공유 미지원 브라우저는 PNG 내려받기)
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /이미지 저장|공유하기/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^euro-passport-story-\d{4}-\d{2}-\d{2}\.png$/);
  // 스냅샷 뒤 지도 카메라는 원래대로
  expect(await camera()).toEqual(before);

  // 국가 카드 (완성한 룩셈부르크)
  await openApp(page, '/?country=LU');
  await page.getByRole('button', { name: '룩셈부르크 카드 공유' }).click();
  await expect(page.locator('dialog[open] img')).toBeVisible({ timeout: 30_000 });
  expect(await previewSize(page)).toEqual([1080, 1350]);
  await page.getByRole('button', { name: '닫기' }).click();

  // 도시 카드는 두 번 이상 간 도시에만
  await openApp(page, '/?city=lu-vianden');
  await expect(page.getByRole('heading', { name: '비안덴' })).toBeVisible();
  await expect(page.getByRole('button', { name: /카드 공유/ })).toHaveCount(0);
  await openApp(page, '/?city=cz-prague');
  await page.getByRole('button', { name: '프라하 카드 공유' }).click();
  await expect(page.locator('dialog[open] img')).toBeVisible({ timeout: 30_000 });
});

test('연말 결산: ?wrap=2026으로 열고 5장을 넘긴다', async ({ page }) => {
  await openApp(page);
  await seed(page);
  await page.goto('/?wrap=2026');
  const main = page.getByRole('main', { name: 'My Euro Year 2026' });
  await expect(main).toBeVisible();
  await expect(main.getByRole('img')).toHaveCount(5, { timeout: 60_000 });
  await expect(main.getByRole('img').first()).toHaveAttribute(
    'alt',
    /^2026년의 여행: 도시 5곳, 나라 3개, 방문 6번/,
  );
  await expect(main.getByRole('button', { name: '이전 장' })).toBeDisabled();
  await main.getByRole('button', { name: '다음 장' }).click();
  await expect(main.getByRole('button', { name: '이전 장' })).toBeEnabled();
  const download = page.waitForEvent('download');
  await main.getByRole('button', { name: /이 장 (저장|공유)/ }).click();
  expect((await download).suggestedFilename()).toBe('my-euro-year-2026-2.png');
  await main.getByRole('button', { name: '닫기' }).click();
  await expect(main).toBeHidden();
});
