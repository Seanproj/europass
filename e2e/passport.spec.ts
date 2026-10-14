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

test('여권 넘기기: 연도별 페이지를 버튼·키보드·스와이프로 넘기고, 도장을 누르면 도시 상세', async ({
  page,
}) => {
  await openApp(page);
  await seed(page);
  // 2025년 기록 하나를 더해 두 장으로
  await page.evaluate(() =>
    (window as unknown as DevWindow).__db.visits.bulkPut([
      {
        id: 'y25',
        cityId: 'fr-paris',
        date: '2025-06-11',
        note: '',
        photos: [],
        createdAt: 1,
        updatedAt: 1,
      },
    ]),
  );
  await page.goto('/?profile');
  const book = page.getByRole('group', { name: /^\d{4}년.*도장 \d+개/ });
  // 처음엔 가장 최근 페이지
  await expect(book).toHaveAttribute('aria-label', /^2026년, 도장 6개/);

  await page.getByRole('button', { name: '이전 페이지' }).click();
  await expect(book).toHaveAttribute('aria-label', /^2025년, 도장 1개/);
  await expect(page.getByRole('button', { name: '이전 페이지' })).toBeDisabled();

  // 키보드 → 다음 장
  await book.focus();
  await page.keyboard.press('ArrowRight');
  await expect(book).toHaveAttribute('aria-label', /^2026년/);

  // 오른쪽으로 끌면 앞 장 (넘기는 중에는 두 장이 겹쳐 있어 끝나길 기다린다)
  await expect(page.getByTestId('passport-page')).toHaveCount(1);
  const box = (await page.getByTestId('passport-page').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.08);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.08, { steps: 8 });
  await page.mouse.up();
  await expect(book).toHaveAttribute('aria-label', /^2025년/);

  await book.getByRole('button', { name: /파리, 2025년 6월 11일/ }).click();
  await expect(page).toHaveURL(/\?city=fr-paris/);
});
