/**
 * 특별한 순간 연출 (Phase 15): 새 나라의 첫 도장, N번째 도장, 국기 퍼즐 완성 때
 * 도장 "쾅" 뒤에 큰 카드가 뜨고, 되돌리기 토스트는 그대로 쓸 수 있다. 같은 기념은 한 번만
 */
import { expect, test } from '@playwright/test';
import { checkInBySearch, openApp, seed, type DevWindow, type Row } from './support/app';

test('새 나라 첫 도장: 도장 연출이 끝난 뒤 기념 카드, 같은 나라는 다시 안 뜬다', async ({ page }) => {
  await openApp(page);
  await checkInBySearch(page, '프라하');
  const card = page.getByTestId('celebration');
  // 도장이 먼저, 기념은 도장이 사라진 다음
  await expect(page.getByTestId('stamp-burst')).toBeVisible();
  await expect(card).toBeHidden();
  await expect(card).toBeVisible();
  await expect(page.getByTestId('stamp-burst')).toBeHidden();
  await expect(card.getByRole('heading', { name: '체코 첫 도장' })).toBeVisible();
  await expect(card).toContainText('새 나라');
  await expect(card).toContainText('여권의 첫 나라예요');
  // 되돌리기 토스트를 가리지 않는다
  const undo = page.getByRole('button', { name: '되돌리기' });
  await expect(undo).toBeVisible();
  const [c, u] = await Promise.all([card.boundingBox(), undo.boundingBox()]);
  expect(c!.y + c!.height).toBeLessThan(u!.y);

  await card.getByRole('button', { name: '닫기' }).click();
  await expect(card).toBeHidden();

  // 이미 간 나라의 다른 도시는 기념이 아니다
  await openApp(page);
  await checkInBySearch(page, '브르노');
  await expect(page.getByText('브르노 도장 획득')).toBeVisible();
  await expect(page.getByTestId('stamp-burst')).toBeHidden();
  await expect(card).toBeHidden();
});

test('되돌리기는 기념도 거두고, 다시 찍으면 다시 기념한다', async ({ page }) => {
  await openApp(page);
  await checkInBySearch(page, '빈');
  const card = page.getByTestId('celebration');
  await expect(card.getByRole('heading', { name: '오스트리아 첫 도장' })).toBeVisible();
  await page.getByRole('button', { name: '되돌리기' }).click();
  await expect(card).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as unknown as DevWindow).__db.visits.count())).toBe(0);

  await openApp(page);
  await checkInBySearch(page, '빈');
  await expect(card.getByRole('heading', { name: '오스트리아 첫 도장' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
});

test('10번째 도장 + 새 나라: 큰 숫자 카드와 기념 카드 공유', async ({ page }) => {
  await openApp(page);
  // 6개 + 3개 = 9개 (체코·룩셈부르크·노르웨이)
  await seed(page);
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
    await w.__db.visits.bulkPut([
      row('x1', 'cz-brno', '2026-04-01'),
      row('x2', 'no-bergen', '2026-05-01'),
      row('x3', 'cz-prague', '2026-06-01'),
    ]);
  });
  await checkInBySearch(page, '베를린');
  const card = page.getByTestId('celebration');
  await expect(card.getByRole('heading', { name: '10번째 도장' })).toBeVisible();
  await expect(card).toContainText('기념 도장');
  await expect(card).toContainText('베를린에서 찍었어요 · 독일 첫 도장');

  await card.getByRole('button', { name: '기념 카드' }).click();
  const dialog = page.getByRole('dialog', { name: '기념 카드 공유' });
  await expect(dialog).toBeVisible();
  const preview = dialog.getByRole('img');
  await expect(preview).toBeVisible();
  // 카드가 실제로 그려졌다 (1080×1350 PNG)
  await expect
    .poll(() => preview.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]))
    .toEqual([1080, 1350]);
});

test('마지막 조각을 칠하면 국기 완성', async ({ page }) => {
  await openApp(page);
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
    await w.__db.visits.bulkPut([
      row('l1', 'lu-luxembourg', '2026-07-01'),
      row('l2', 'lu-echternach', '2026-07-02'),
    ]);
  });
  await checkInBySearch(page, '비안덴');
  const card = page.getByTestId('celebration');
  await expect(card.getByRole('heading', { name: '룩셈부르크 국기 완성' })).toBeVisible();
  await expect(card).toContainText('조각 3개를 모두 모았어요');
});
