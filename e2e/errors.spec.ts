import { expect, test } from '@playwright/test';
import { blockTiles, openApp } from './support/app';

test('저장소를 쓸 수 없으면(시크릿 모드 등) 안내 화면', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, get: () => undefined });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '기록을 저장할 수 없어요' })).toBeVisible();
  await expect(page.getByText(/시크릿\(개인 정보 보호\) 모드/)).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('지도 타일을 못 받으면 간단한 지도 + 안내 한 번', async ({ page }) => {
  await blockTiles(page);
  await openApp(page);
  await expect(page.getByText('지도 일부를 불러오지 못했어요. 잠시 뒤 다시 시도해요')).toBeVisible();
  // 앱은 그대로 쓸 수 있다
  await expect(page.getByRole('button', { name: /어디 다녀오셨어요/ })).toBeVisible();
});

test('저장 공간이 90% 넘게 차면 알리고, 설정에 사용량을 보여 준다', async ({ page }) => {
  await page.addInitScript(() => {
    const storage = navigator.storage;
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      get: () => ({
        persist: () => storage.persist(),
        persisted: () => storage.persisted(),
        estimate: () => Promise.resolve({ usage: 950 * 1024 ** 2, quota: 1000 * 1024 ** 2 }),
      }),
    });
  });
  await openApp(page);
  await expect(page.getByText('저장 공간이 거의 찼어요')).toBeVisible();
  await page.getByRole('button', { name: '확인' }).click();
  const main = page.getByRole('main');
  await expect(main.getByText('950MB 사용')).toBeVisible();
  await expect(main.getByText('거의 찼어요. 백업을 내보낸 뒤 사진을 정리해 주세요')).toBeVisible();
});
