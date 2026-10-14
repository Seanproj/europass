import { expect, test, type Page } from '@playwright/test';

type DevWindow = Window & { __map: { loaded(): boolean } };

/** 테스트용 JPEG (브라우저 캔버스로 만든다) */
async function makeJpeg(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c9e0b5';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#d8443a';
    ctx.fillRect(120, 80, 160, 140);
    return c.toDataURL('image/jpeg', 0.9);
  });
  return Buffer.from(dataUrl.split(',')[1]!, 'base64');
}

test('국가 탭 → 국가 상세 → 체크인 → 사진 → 다시 방문(과거) → 타임라인 2건 → 뒤로 2번으로 홈', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });

  // 지도의 나라 태그 → 국가 상세
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

  // 타임라인 항목을 펼쳐 사진 추가
  await page.getByRole('button', { name: /첫 방문/ }).click();
  await page
    .getByLabel('사진 파일')
    .setInputFiles({ name: 'munich.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page) });
  await expect(page.getByRole('button', { name: '사진 1 빼기' })).toBeVisible();
  await expect(page.getByRole('list', { name: '사진' }).getByRole('button')).toHaveCount(1);
  await page.getByRole('button', { name: '완료' }).click();

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
