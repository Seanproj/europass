/** 1년 전 오늘 (Phase 14): 시작할 때 회상 카드, 누르면 도시 상세, 공유, 닫으면 그날은 다시 안 뜸 */
import { expect, test } from '@playwright/test';
import { openApp, type DevWindow, type Row } from './support/app';

test('회상 카드: 1년 전 오늘 기록이 있으면 시트 맨 위에, 닫으면 그날은 숨김', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-15T10:00:00') });
  await openApp(page);
  await page.evaluate(async () => {
    const row = (id: string, cityId: string, date: string, note = ''): Row => ({
      id,
      cityId,
      date,
      note,
      photos: [],
      createdAt: 1,
      updatedAt: 1,
    });
    await (window as unknown as DevWindow).__db.visits.bulkPut([
      row('m1', 'cz-prague', '2025-10-15', '카를교 야경'),
      row('m2', 'fr-paris', '2026-03-01'),
    ]);
  });

  // 다시 열면 시트가 반쯤 열리고 회상 카드가 맨 위
  await openApp(page);
  const card = page.getByRole('region', { name: '1년 전 오늘의 기록' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('프라하에 있었어요');
  await expect(card).toContainText('2025.10.15');
  await expect(card).toContainText('카를교 야경');
  await expect(page.getByRole('button', { name: /^시트 크기 바꾸기/ })).toHaveAttribute(
    'aria-label',
    /반쯤 펼침/,
  );

  // 공유 → 도시 카드
  await card.getByRole('button', { name: '프라하 카드 공유' }).click();
  await expect(page.getByRole('dialog', { name: '도시 카드' })).toBeVisible();
  await page.keyboard.press('Escape');

  // 누르면 그 도시 상세
  await card.getByRole('button', { name: /프라하에 있었어요/ }).click();
  await expect(page).toHaveURL(/\?city=cz-prague/);
  await page.goBack();

  // 닫으면 오늘은 다시 안 뜬다 (다시 열어도)
  await page.getByRole('button', { name: '오늘은 그만 보기' }).click();
  await expect(card).toHaveCount(0);
  await openApp(page);
  await expect(page.getByText('나의 유럽')).toBeAttached();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^시트 크기 바꾸기/ })).toHaveAttribute('aria-label', /접힘/);
});
