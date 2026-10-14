/** 도장 여권 (Phase 10): 첫 도장 안내, 프로필의 "내 여권" 도감 */
import { expect, test } from '@playwright/test';
import { openApp, seed, type DevWindow, type Row } from './support/app';

test('기록이 없으면 시트 홈에 첫 도장 안내 → "도시 찾기"로 검색이 열린다', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('첫 도장을 찍어보세요')).toBeVisible();
  await page.getByRole('button', { name: '도시 찾기' }).click();
  await expect(page.getByRole('searchbox', { name: '도시 검색' })).toBeFocused();
});

test('내 여권: 모은 수 / 전체, 도시마다 도장 하나(첫 방문순), 재방문 표식, 모두 보기', async ({ page }) => {
  await openApp(page);
  await seed(page);
  await page.goto('/?profile');
  const book = page.getByRole('region', { name: '내 여권' });
  // seed: 트롬쇠(1월) → 프라하(3월, 2번) → 룩셈부르크 3곳(7월)
  await expect(book.locator('dd').first()).toHaveText(/^5\s*\/\s*\d{3}$/);
  const cells = book.getByRole('list', { name: '모은 도장' }).getByRole('button');
  await expect(cells.locator('span')).toHaveText(['트롬쇠', '프라하', '룩셈부르크', '에흐터나흐', '비안덴']);
  // 프라하는 두 번째 방문 도장 (로마 숫자 II)
  await expect(cells.nth(1).locator('text', { hasText: /^II$/ })).toHaveCount(1);
  await expect(book.getByRole('button', { name: /모두 보기/ })).toHaveCount(0);

  // 9곳을 넘으면 처음엔 9개만, "모두 보기"로 펼친다
  await page.waitForFunction(() => !!(window as unknown as DevWindow).__db);
  await page.evaluate(async () => {
    const ids = ['at-vienna', 'at-salzburg', 'at-innsbruck', 'be-brussels', 'be-antwerp', 'be-ghent'];
    const rows: Row[] = ids.map((cityId, i) => ({
      id: `x${i}`,
      cityId,
      date: `2026-08-0${i + 1}`,
      note: '',
      photos: [],
      createdAt: 1,
      updatedAt: 1,
    }));
    await (window as unknown as DevWindow).__db.visits.bulkPut(rows);
  });
  await expect(cells).toHaveCount(9);
  await book.getByRole('button', { name: '더 보기 (2)' }).click();
  await expect(cells).toHaveCount(11);
  await book.getByRole('button', { name: '접기' }).click();
  await expect(cells).toHaveCount(9);

  // 도장을 누르면 그 도시 상세
  await cells.first().click();
  await expect(page).toHaveURL(/\?city=no-tromso/);
});
