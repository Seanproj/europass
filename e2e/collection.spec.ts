import { expect, test } from '@playwright/test';
import { collapseSheet, makeJpeg, type DevWindow as DbWindow } from './support/app';

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

test('날짜: 지난 날짜 + 머문 기간으로 다시 방문 기록, 방문일을 옮기면 기간은 그대로', async ({ page }) => {
  await page.goto('/?city=de-munich');
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: '여기 다녀왔어요' }).click();
  await expect(page.getByText('뮌헨 도장 획득')).toBeHidden({ timeout: 10_000 });

  // 2014년 1월 15일 도착, 하루씩 두 번 늘리면 2박 3일 · 1월 17일까지
  await page.getByRole('button', { name: '다시 방문 기록' }).click();
  await page.getByLabel('언제 다녀왔나요?').fill('2014-01-15');
  const stay = page.getByRole('group', { name: '머문 기간' });
  await expect(stay).toContainText('당일');
  await stay.getByRole('button', { name: '하루 늘리기' }).click();
  await stay.getByRole('button', { name: '하루 늘리기' }).click();
  await expect(stay).toContainText('2박 3일');
  await expect(stay).toContainText('2014년 1월 17일까지');
  await page.getByRole('button', { name: '기록', exact: true }).click();

  const items = page.getByRole('list', { name: '방문 기록' }).locator(':scope > li');
  await expect(items).toHaveCount(2);
  const old = items.nth(1);
  await expect(old).toContainText('2014.01.15 – 01.17 · 2박 3일');

  // 펼쳐서 방문일을 2월 10일로 옮기면 떠난 날도 2월 12일로
  await old.getByRole('button', { name: /첫 방문/ }).click();
  await old.getByLabel('방문일').fill('2014-02-10');
  await expect(old).toContainText('2014.02.10 – 02.12 · 2박 3일');
  // 기간 줄이기
  await old.getByRole('group', { name: '머문 기간' }).getByRole('button', { name: '하루 줄이기' }).click();
  await expect(old).toContainText('2014.02.10 – 02.11 · 1박 2일');
});

test('사진 보기: 시트 안에서 열어도 화면 전체를 덮고 사진이 가운데', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });
  const jpeg = await makeJpeg(page);
  await page.evaluate(
    async (bytes) => {
      const photo = new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
      await (window as unknown as DbWindow).__db.visits.bulkPut([
        {
          id: 'ph1',
          cityId: 'cz-prague',
          date: '2026-05-01',
          note: '',
          photos: [photo],
          createdAt: 1,
          updatedAt: 1,
        },
      ]);
    },
    [...jpeg],
  );
  await page.goto('/?city=cz-prague');
  await page.getByRole('button', { name: '사진 1 보기' }).click();

  const viewer = page.getByRole('dialog', { name: /사진/ });
  await expect(viewer).toBeVisible();
  const vp = page.viewportSize()!;
  // 바텀시트의 transform 안에 갇히지 않고 화면 전체
  expect(await viewer.boundingBox()).toEqual({ x: 0, y: 0, width: vp.width, height: vp.height });
  const img = (await viewer.locator('img').boundingBox())!;
  expect(Math.abs(img.y + img.height / 2 - vp.height / 2)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
});
