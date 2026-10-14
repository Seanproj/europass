import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openApp, seed } from './support/app';

/** WCAG 2.1 AA. 지도 캔버스(WebGL)와 MapLibre 출처 표기는 외부 구성요소라 제외 */
async function scan(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.maplibregl-canvas')
    .exclude('.maplibregl-ctrl-attrib')
    .analyze();
  const summary = result.violations.map(
    (v) =>
      `${label}: ${v.id} (${v.impact}) — ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 4)
        .join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`접근성 검사 (axe, ${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await openApp(page);
    await seed(page);
    await page.waitForTimeout(500);
    await scan(page, '홈');

    await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
    await page.getByRole('searchbox', { name: '도시 검색' }).fill('프라');
    await scan(page, '검색');
    await page.getByRole('button', { name: '검색 닫기' }).click();

    await openApp(page, '/?country=LU');
    await expect(page.getByRole('heading', { name: '룩셈부르크' })).toBeVisible();
    await scan(page, '국가 상세');

    await openApp(page, '/?city=cz-prague');
    await expect(page.getByRole('heading', { name: '프라하' })).toBeVisible();
    await scan(page, '도시 상세');

    await openApp(page, '/?profile');
    await expect(page.getByRole('main', { name: 'Sean' })).toBeVisible();
    await scan(page, '프로필');

    await page.getByRole('button', { name: '모두 보기' }).click();
    await scan(page, '배지 시트');
    await page.getByRole('button', { name: '닫기' }).click();

    await page.getByRole('button', { name: '공유', exact: true }).click();
    await expect(page.locator('dialog[open] img')).toBeVisible({ timeout: 30_000 });
    await scan(page, '공유 시트');
    await page.getByRole('button', { name: '닫기' }).click();

    await page.goto('/?wrap=2026');
    await expect(page.getByRole('main', { name: 'My Euro Year 2026' }).getByRole('img')).toHaveCount(5, {
      timeout: 60_000,
    });
    await scan(page, '연말 결산');
  });
}

test('키보드: 지도의 방문 도시를 Tab으로 골라 Enter로 열기', async ({ page }) => {
  await openApp(page);
  await seed(page);
  const prague = page.getByRole('button', { name: '프라하, 2번 방문' });
  await expect(prague).toHaveAttribute('tabindex', '0');
  await prague.focus();
  await expect(prague).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\?city=cz-prague$/);
  await expect(page.getByRole('heading', { name: '프라하' })).toBeVisible();
});

test('시트를 끝까지 펼치면 포커스가 시트 안에만, Esc로 반쯤 접기', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  const input = page.getByRole('searchbox', { name: '도시 검색' });
  await expect(input).toBeFocused();
  // 펼친 동안 지도와 상단 버튼은 inert
  const profileInert = () =>
    page.locator('button[aria-label="프로필"]').evaluate((el) => !!el.closest('[inert]'));
  expect(await profileInert()).toBe(true);
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('section[aria-label="나의 유럽"]')),
  ).toBe(true);
  // 검색창의 Esc는 검색만 닫는다
  await input.press('Escape');
  await expect(input).toBeHidden();
  // 시트 크기 버튼으로 끝까지 펼친 뒤 Esc → 반쯤
  const handle = page.getByRole('button', { name: /시트 크기 바꾸기/ });
  while (!(await handle.getAttribute('aria-label'))?.includes('지금: 펼침')) await handle.click();
  await handle.press('Escape');
  await expect(handle).toHaveAttribute('aria-label', /지금: 반쯤 펼침/);
  expect(await profileInert()).toBe(false);
});
