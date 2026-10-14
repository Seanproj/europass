/**
 * 시각 회귀 (모바일 390×844, 라이트/다크). 지도 타일을 막아 최소 스타일로 고정하고, 날짜도 고정한다.
 * 기준 이미지 갱신: npx playwright test e2e/visual.spec.ts --update-snapshots
 */
import { expect, test, type Page } from '@playwright/test';
import { blockTiles, collapseSheet, openApp, seed } from './support/app';

async function prepare(page: Page, scheme: 'light' | 'dark') {
  await page.clock.install({ time: new Date('2026-10-14T10:00:00') });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await blockTiles(page);
  await openApp(page);
  await seed(page);
  // 빈 상태로 열려 반쯤 펼쳐진 시트(첫 도장 안내)를 기록이 있을 때처럼 접는다
  await collapseSheet(page);
  // 타일 실패 안내 토스트가 지나가고 안개 구멍이 다 열릴 때까지
  await expect(page.getByRole('status')).toBeEmpty({ timeout: 15_000 });
  await page.waitForTimeout(800);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`화면 (${scheme}): 홈 · 도시 상세 · 프로필`, async ({ page }) => {
    await prepare(page, scheme);
    await expect(page).toHaveScreenshot(`home-${scheme}.png`);

    await page.getByRole('button', { name: '프라하, 2번 방문' }).click({ force: true });
    await expect(page.getByRole('heading', { name: '프라하' })).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 400 }, force: true, trial: true });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot(`city-${scheme}.png`);

    await page.goto('/?profile');
    await expect(page.getByRole('main', { name: 'Sean' })).toBeVisible();
    await page.waitForTimeout(500);
    // 지도(뒤에 가려짐)와 타일 실패 안내(막힌 타일을 다시 시도할 때마다 뜸)와 상관없이 페이지만.
    // mask는 화면 전체를 덮는 지도 캔버스 크기라 페이지까지 가려서 쓰지 않는다
    await page.addStyleTag({
      content: '.maplibregl-canvas, [role="status"] { visibility: hidden !important; }',
    });
    await expect(page).toHaveScreenshot(`profile-${scheme}.png`);
  });
}

// 애니메이션 중간은 프레임 타이밍에 따라 조금씩 달라 비교하지 않고 결과물로만 남긴다
test('도장 "쾅" 애니메이션 중간 프레임 (결과물로 저장)', async ({ page }, info) => {
  // 가상 시계로 260ms 스프링의 중간(130ms)에서 멈춰 찍는다
  await page.clock.install({ time: new Date('2026-10-14T10:00:00') });
  await blockTiles(page);
  await openApp(page);
  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  await page.getByRole('searchbox', { name: '도시 검색' }).fill('ㅍㄹㅎ');
  const first = page.getByRole('list', { name: '검색 결과' }).getByRole('button').first();
  await expect(first).toContainText('프라하');
  await page.clock.pauseAt(new Date('2026-10-14T10:01:00'));
  await first.click();
  await page.clock.runFor(130);
  await expect(page.getByTestId('stamp-burst')).toBeVisible();
  await page.screenshot({ path: info.outputPath('stamp-mid.png') });
});
