import { expect, test } from '@playwright/test';

test('PWA: 매니페스트와 서비스 워커, 오프라인에서 다시 열기', async ({ page, context }) => {
  await page.goto('/');
  // 매니페스트: 이름, 아이콘 (192 · 512 · 마스커블)
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: 'Euro Passport', display: 'standalone', start_url: './' });
  expect(
    manifest.icons.map(
      (i: { sizes: string; purpose?: string }) => `${i.sizes}${i.purpose ? ` ${i.purpose}` : ''}`,
    ),
  ).toEqual(['192x192', '512x512', '512x512 maskable']);
  for (const icon of manifest.icons) expect((await page.request.get(`/${icon.src}`)).ok()).toBe(true);
  expect((await page.request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);

  // 서비스 워커가 페이지를 맡을 때까지
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('button', { name: /어디 다녀오셨어요/ })).toBeVisible();

  // 오프라인: 앱 셸은 캐시에서, 앱 안 주소(?city=)도 index.html로
  await context.setOffline(true);
  await page.goto('/?city=cz-prague');
  await expect(page.getByRole('heading', { name: '프라하' })).toBeVisible({ timeout: 20_000 });
  await context.setOffline(false);
});

test('PWA: /v0/은 v1 서비스 워커가 가로채지 않는다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  // v0는 자기 서비스 워커가 있으므로 v1 서비스 워커가 응답하면 안 된다
  const v0 = await page.goto('/v0/');
  expect(v0?.fromServiceWorker()).toBe(false);
  // 비교: 앱 안 주소는 서비스 워커가 index.html로 응답
  const app = await page.goto('/?profile');
  expect(app?.fromServiceWorker()).toBe(true);
});

test('오프라인 지도 미리 받기: 켜 두면 체크인한 도시 둘레 z8~13 타일이 캐시에 쌓인다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.evaluate(() => localStorage.setItem('euro-passport:prefetch-tiles', '1'));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // 지도(벡터 타일 주소)가 준비될 때까지
  await page.waitForFunction(() => document.querySelector('.maplibregl-canvas'), null, { timeout: 30_000 });
  await page.waitForTimeout(3000);

  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  await page.getByRole('searchbox', { name: '도시 검색' }).fill('프라하');
  await page.getByRole('list', { name: '검색 결과' }).getByRole('button').first().click();
  await expect(page.getByText('프라하 도장 획득')).toBeVisible();

  const cached = () =>
    page.evaluate(async () => {
      const keys = await (await caches.open('map-tiles')).keys();
      return keys.map((r) => r.url);
    });
  // 프라하 z13 타일 (4424, 2774)
  await expect
    .poll(async () => (await cached()).some((u) => /\/13\/4424\/2774\./.test(u)), { timeout: 30_000 })
    .toBe(true);
  expect((await cached()).some((u) => /\/8\/138\/86\./.test(u))).toBe(true);
});
