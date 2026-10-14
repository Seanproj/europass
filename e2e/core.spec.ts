/**
 * 핵심 시나리오 5개: 첫 진입 · 체크인 · 되돌리기 · 사진 추가 · 백업 복원
 * (세부 흐름은 collection / profile / share / a11y / errors / pwa / visual 스펙에)
 */
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { checkInBySearch, makeJpeg, openApp, type DevWindow } from './support/app';

const visits = (page: Page, cityId?: string) =>
  page.evaluate((id) => {
    const db = (window as unknown as DevWindow).__db;
    return id ? db.visits.where('cityId').equals(id).count() : db.visits.count();
  }, cityId);

test('1. 첫 진입: 빈 지도와 검색 시트, 가로 스크롤 없음', async ({ page }) => {
  await openApp(page);
  await expect(page.getByLabel('0개 도시, 0개국 방문')).toBeVisible();
  await expect(page.getByRole('button', { name: /어디 다녀오셨어요/ })).toBeVisible();
  await expect(page.getByRole('region', { name: '유럽 지도' })).toBeVisible();
  await expect(page.getByRole('button', { name: '프로필' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await visits(page)).toBe(0);
});

test('2. 체크인: "ㅍㄹㅎ" → 프라하 도장, 도시 상세, 지도가 프라하로', async ({ page }) => {
  await openApp(page);
  await checkInBySearch(page, 'ㅍㄹㅎ');
  await expect(page.getByTestId('stamp-burst')).toBeVisible();
  await expect(page.getByText('프라하 도장 획득')).toBeVisible();
  await expect(page.getByRole('heading', { name: '프라하' })).toBeVisible();
  await expect(page).toHaveURL(/\?city=cz-prague$/);
  expect(await visits(page, 'cz-prague')).toBe(1);
  await expect(page.getByLabel('1개 도시, 1개국 방문')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const m = (window as unknown as DevWindow).__map;
        const c = m.getCenter();
        return m.getZoom() > 8 && Math.abs(c.lng - 14.42) < 1.5 && Math.abs(c.lat - 50) < 3;
      }),
    )
    .toBe(true);
});

test('3. 되돌리기: 기록과 진행률이 원래대로', async ({ page }) => {
  await openApp(page);
  await checkInBySearch(page, '프라하');
  await expect(page.getByText('프라하 도장 획득')).toBeVisible();
  await page.getByRole('button', { name: '되돌리기' }).click();
  await expect.poll(() => visits(page)).toBe(0);
  await expect(page.getByLabel('0개 도시, 0개국 방문')).toBeVisible();
  await expect(page.getByText('프라하 도장 획득')).toBeHidden();
  // 줄 서 있던 배지 토스트도 함께 사라진다
  await page.waitForTimeout(6000);
  await expect(page.getByText(/배지 획득/)).toBeHidden();
});

test('4. 사진 추가: 방문 기록에 사진을 넣으면 줄여서 저장된다', async ({ page }) => {
  await openApp(page);
  await checkInBySearch(page, '뮌헨');
  await expect(page.getByText('뮌헨 도장 획득')).toBeVisible();
  await page.getByRole('button', { name: /첫 방문/ }).click();
  await page
    .getByLabel('사진 파일')
    .setInputFiles({ name: 'munich.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page) });
  await expect(page.getByRole('button', { name: '사진 1 빼기' })).toBeVisible();
  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByRole('list', { name: '사진' }).getByRole('button')).toHaveCount(1);
  const photo = await page.evaluate(async () => {
    const db = (window as unknown as DevWindow).__db as unknown as {
      visits: { toArray(): Promise<{ photos: Blob[] }[]> };
    };
    const [v] = await db.visits.toArray();
    return { n: v?.photos.length, type: v?.photos[0]?.type };
  });
  expect(photo).toEqual({ n: 1, type: 'image/jpeg' });
});

test('5. 백업 복원: 내보내기 → 모두 삭제(확인) → 가져오기로 사진까지 돌아온다', async ({ page }) => {
  await openApp(page);
  const jpeg = await makeJpeg(page);
  await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const photo = new Blob([bytes], { type: 'image/jpeg' });
    const w = window as unknown as DevWindow;
    await w.__db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    await w.__db.visits.bulkPut([
      {
        id: 'p1',
        cityId: 'cz-prague',
        date: '2025-03-08',
        note: '카를교',
        photos: [],
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'p2',
        cityId: 'cz-prague',
        date: '2025-09-20',
        note: '',
        photos: [photo],
        createdAt: 1,
        updatedAt: 1,
      },
      { id: 'f1', cityId: 'fr-paris', date: '2025-09-02', note: '', photos: [], createdAt: 1, updatedAt: 1 },
    ]);
  }, jpeg.toString('base64'));

  await page.getByRole('button', { name: '프로필' }).click();
  const main = page.getByRole('main', { name: 'Sean' });
  const download = page.waitForEvent('download');
  await main.getByRole('button', { name: /백업 내보내기/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^euro-passport-\d{4}-\d{2}-\d{2}\.zip$/);
  // 테스트 제목이 들어간 출력 폴더(한글·기호)는 파일 선택에서 열리지 않아 ASCII 임시 폴더에 둔다
  const zipPath = join(await mkdtemp(join(tmpdir(), 'ep-backup-')), 'backup.zip');
  await file.saveAs(zipPath);
  expect((await readFile(zipPath)).subarray(0, 2).toString()).toBe('PK');

  await main.getByRole('button', { name: /모든 기록 삭제/ }).click();
  await page
    .getByRole('dialog', { name: '모든 기록 삭제' })
    .getByRole('button', { name: '모두 삭제' })
    .click();
  await expect(page.getByText('모든 기록을 지웠어요')).toBeVisible();
  expect(await visits(page)).toBe(0);

  await main.locator('input[type="file"]').setInputFiles(zipPath);
  await expect(page.getByText('기록 3개를 가져왔어요')).toBeVisible();
  const restored = await page.evaluate(async () => {
    const v = await (window as unknown as DevWindow).__db.visits.get('p2');
    return { type: v?.photos[0]?.type, size: v?.photos[0]?.size };
  });
  expect(restored.type).toBe('image/jpeg');
  expect(restored.size).toBe(jpeg.length);
  await expect(main.getByText(/총 3번의 방문 · 가장 많이 간 도시 프라하\(2\)/)).toBeVisible();
});
