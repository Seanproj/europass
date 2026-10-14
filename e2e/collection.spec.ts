import { expect, test } from '@playwright/test';
import { collapseSheet } from './support/app';

type DevWindow = Window & { __map: { loaded(): boolean } };

test('국가 탭 → 국가 상세 → 체크인 → 다시 방문(과거) → 타임라인 2건 → 뒤로 2번으로 홈', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });

  // 지도의 나라 태그 → 국가 상세 (첫 도장 안내로 반쯤 열린 시트를 먼저 접는다)
  await collapseSheet(page);
  await page.getByRole('button', { name: '독일', exact: true }).click();
  await expect(page).toHaveURL(/\?country=DE$/);
  await expect(page.getByRole('heading', { name: '독일', level: 2 })).toBeVisible();
  await expect(page.getByText('0 / 10 조각')).toBeVisible();

  // 도시 그리드 → 도시 상세(고스트) → 체크인
  await page.getByRole('button', { name: '뮌헨', exact: true }).click();
  await expect(page).toHaveURL(/\?city=de-munich$/);
  await page.getByRole('button', { name: '여기 다녀왔어요' }).click();
  await expect(page.getByText('뮌헨 도장 획득')).toBeVisible();
  await expect(page.getByRole('list', { name: '방문 기록' }).locator(':scope > li')).toHaveCount(1);
  // 토스트가 사라진 뒤 진행
  await expect(page.getByText('뮌헨 도장 획득')).toBeHidden({ timeout: 10_000 });

  // 다시 방문 기록: 지난 날짜로 소급
  await page.getByRole('button', { name: '다시 방문 기록' }).click();
  await page.getByLabel('언제 다녀왔나요?').fill('2025-05-01');
  await page.getByRole('button', { name: '기록', exact: true }).click();

  // 타임라인에 2건, 최신(오늘)이 위, 2025.05.01이 첫 방문
  const items = page.getByRole('list', { name: '방문 기록' }).locator(':scope > li');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText('2번째');
  await expect(items.nth(0)).toContainText('LATEST');
  await expect(items.nth(1)).toContainText('첫 방문');
  await expect(items.nth(1)).toContainText('2025.05.01');
  await expect(page.getByText('독일 · 2번 방문 · 총 2일')).toBeVisible();

  // 뒤로가기 2번 → 국가 → 홈
  await page.goBack();
  await expect(page).toHaveURL(/\?country=DE$/);
  await expect(page.getByText('1 / 10 조각')).toBeVisible();
  await page.getByRole('button', { name: '뒤로' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: '나의 유럽' })).toBeVisible();
});
