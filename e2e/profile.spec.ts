import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('프로필: 숫자·배지·타임라인 → 백업 내보내기 → 모두 삭제 → 가져오기로 사진까지 복원', async ({
  page,
}, info) => {
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

  // 내보내기
  const download = page.waitForEvent('download');
  await main.getByRole('button', { name: /백업 내보내기/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^euro-passport-\d{4}-\d{2}-\d{2}\.zip$/);
  // 테스트 제목이 들어간 출력 폴더(한글·기호)는 파일 선택에서 열리지 않아 ASCII 임시 폴더에 둔다
  const zipPath = join(await mkdtemp(join(tmpdir(), 'ep-backup-')), 'backup.zip');
  await file.saveAs(zipPath);
  expect((await readFile(zipPath)).subarray(0, 2).toString()).toBe('PK');

  // 모두 삭제 (확인 필요)
  await main.getByRole('button', { name: /모든 기록 삭제/ }).click();
  await page
    .getByRole('dialog', { name: '모든 기록 삭제' })
    .getByRole('button', { name: '모두 삭제' })
    .click();
  await expect(page.getByText('모든 기록을 지웠어요')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as DevWindow).__db.visits.count())).toBe(0);
  await expect(main.getByText('아직 방문 기록이 없어요')).toBeVisible();

  // 가져오기
  await main.locator('input[type="file"]').setInputFiles(zipPath);
  await expect(page.getByText('기록 3개를 가져왔어요')).toBeVisible();
  const restored = await page.evaluate(async () => {
    const v = await (window as unknown as DevWindow).__db.visits.get('p2');
    return { type: v?.photos[0]?.type, size: v?.photos[0]?.size };
  });
  expect(restored.type).toBe('image/jpeg');
  expect(restored.size).toBeGreaterThan(500);
  await expect(main.getByText('총 3번의 방문 · 가장 많이 간 도시 프라하(2)')).toBeVisible();

  // 뒤로 → 지도
  await main.getByRole('button', { name: '지도로 돌아가기' }).click();
  await expect(main).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});
