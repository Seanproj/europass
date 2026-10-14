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
  __map: { loaded(): boolean };
  __db: {
    visits: {
      bulkPut(v: Row[]): Promise<unknown>;
      count(): Promise<number>;
      get(id: string): Promise<Row | undefined>;
    };
    settings: { put(r: { key: string; value: unknown }): Promise<unknown> };
  };
};

async function openApp(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });
}

/** 방문 3건 (프라하 2번 + 사진 1장, 파리 1번) */
async function seed(page: Page) {
  await page.evaluate(async () => {
    const w = window as unknown as DevWindow;
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 240;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#a9d0e4';
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#d8443a';
    ctx.fillRect(100, 60, 120, 120);
    const photo = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9));
    const row = (id: string, cityId: string, date: string, note = '', photos: Blob[] = []): Row => ({
      id,
      cityId,
      date,
      note,
      photos,
      createdAt: 1,
      updatedAt: 1,
    });
    await w.__db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    await w.__db.visits.bulkPut([
      row('p1', 'cz-prague', '2025-03-08', '카를교 야경\n둘째 줄'),
      row('p2', 'cz-prague', '2025-09-20', '', [photo]),
      row('f1', 'fr-paris', '2025-09-02', '오르세'),
    ]);
  });
}

test('체크인 토스트 다음에 배지 토스트가 한 번 나온다', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  await page.getByRole('searchbox', { name: '도시 검색' }).fill('프라하');
  await page.getByRole('list', { name: '검색 결과' }).getByRole('button').first().click();
  await expect(page.getByText('프라하 도장 획득')).toBeVisible();
  await expect(page.getByText('배지 획득 · 첫 도장')).toBeHidden();
  // 체크인 토스트(5초)가 사라지면 다음 차례로
  await expect(page.getByText('배지 획득 · 첫 도장')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('배지 획득 · 첫 도장')).toBeHidden({ timeout: 8_000 });
});

test('프로필: 숫자 · 배지(모두 보기) · 타임라인, 뒤로 가면 지도', async ({ page }, info) => {
  await openApp(page);
  await seed(page);
  await page.getByRole('button', { name: '프로필' }).click();
  const main = page.getByRole('main', { name: 'Sean' });
  await expect(main).toBeVisible();
  await expect(page).toHaveURL(/\?profile$/);
  await expect(main.getByText('총 3번의 방문 · 가장 많이 간 도시 프라하(2)')).toBeVisible();
  await expect(main.getByText('· 2번째')).toBeVisible();
  await expect(main.getByText('카를교 야경')).toBeVisible();
  // 360px에서도 가로 스크롤 없음 (배지 줄만 안에서 스크롤)
  expect(await main.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

  await main.getByRole('button', { name: '모두 보기' }).click();
  const grid = page.getByRole('dialog', { name: /배지/ });
  await expect(grid).toBeVisible();
  await expect(grid.getByText('또 왔어요')).toBeVisible();
  await page.screenshot({ path: info.outputPath('badges-grid.png') });
  await grid.getByRole('button', { name: '닫기' }).click();
  await expect(grid).toBeHidden();

  // 뒤로 → 지도
  await main.getByRole('button', { name: '지도로 돌아가기' }).click();
  await expect(main).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});
