/**
 * 기기 간 동기화 (모의 클라우드 서버). 두 브라우저 컨텍스트 = 두 기기
 * 실제 Supabase 대신 scripts/mock-cloud.ts가 같은 서버 동작(LWW, 커서, 공개 필터)을 흉내 낸다
 */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { checkInBySearch, makeJpeg, openApp, type DevWindow } from './support/app';

const MOCK = 'http://localhost:5199';

test.beforeEach(async ({ request }) => {
  await request.post(`${MOCK}/reset`);
});

async function device(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await openApp(page);
  return { ctx, page };
}

/** 프로필 → 설정 → 기기 간 동기화 시트 열기 */
async function openCloudSheet(page: Page) {
  await page.goto('/?profile');
  await page.getByRole('button', { name: /기기 간 동기화/ }).click();
  return page.getByRole('dialog', { name: '기기 간 동기화' });
}

async function login(page: Page, email: string) {
  const sheet = await openCloudSheet(page);
  await sheet.getByLabel(/이메일로 로그인 링크/).fill(email);
  await sheet.getByRole('button', { name: '보내기' }).click();
  await expect(sheet.getByText(email)).toBeVisible();
  return sheet;
}

/** 올릴 변경이 없고 방금 맞췄다 */
async function synced(page: Page) {
  const sheet = page.getByRole('dialog', { name: '기기 간 동기화' });
  await sheet.getByRole('button', { name: '지금 동기화' }).click();
  await expect(sheet.getByText(/켜짐 · 마지막 동기화 방금$/)).toBeVisible({ timeout: 15_000 });
}

const count = (page: Page, cityId: string) =>
  page.evaluate(
    (id) => (window as unknown as DevWindow).__db.visits.where('cityId').equals(id).count(),
    cityId,
  );

test('두 기기: 첫 로그인 업로드 → 다른 기기에서 받기(사진 포함) → 양방향 → 삭제 전파', async ({
  browser,
}) => {
  const a = await device(browser);
  const b = await device(browser);

  // 기기 A: 로그인 전에 기록 + 사진
  await checkInBySearch(a.page, '프라하');
  await expect(a.page.getByText('프라하 도장 획득')).toBeVisible();
  await a.page.getByRole('button', { name: /첫 방문/ }).click();
  await a.page
    .getByLabel('사진 파일')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(a.page) });
  await expect(a.page.getByRole('button', { name: '사진 1 빼기' })).toBeVisible();
  await a.page.getByRole('button', { name: '완료' }).click();

  // 첫 로그인: 이 기기 기록이 올라간다
  await login(a.page, 'sean@example.com');
  await synced(a.page);

  // 기기 B: 같은 계정 → 받는다
  await login(b.page, 'sean@example.com');
  await synced(b.page);
  await expect.poll(() => count(b.page, 'cz-prague')).toBe(1);
  const photo = await b.page.evaluate(async () => {
    const db = (window as unknown as DevWindow).__db as unknown as {
      visits: { toArray(): Promise<{ photos: Blob[] }[]> };
    };
    const [v] = await db.visits.toArray();
    return { n: v?.photos.length, type: v?.photos[0]?.type };
  });
  expect(photo).toEqual({ n: 1, type: 'image/jpeg' });

  // B에서 새 기록 → A가 받는다
  await b.page.goto('/');
  await checkInBySearch(b.page, '파리');
  await expect(b.page.getByText('파리 도장 획득')).toBeVisible();
  await openCloudSheet(b.page);
  await synced(b.page);
  await openCloudSheet(a.page);
  await synced(a.page);
  await expect.poll(() => count(a.page, 'fr-paris')).toBe(1);

  // A에서 프라하 기록 삭제 → B에서도 지워진다
  await a.page.goto('/?city=cz-prague');
  await a.page.getByRole('button', { name: /첫 방문/ }).click();
  await a.page.getByRole('button', { name: '더보기' }).click();
  await a.page.getByRole('button', { name: '이 방문 기록 삭제' }).click();
  await a.page.getByRole('alertdialog').getByRole('button', { name: /삭제/ }).click();
  await expect.poll(() => count(a.page, 'cz-prague')).toBe(0);
  await openCloudSheet(a.page);
  await synced(a.page);
  await openCloudSheet(b.page);
  await synced(b.page);
  await expect.poll(() => count(b.page, 'cz-prague')).toBe(0);
  expect(await count(b.page, 'fr-paris')).toBe(1);

  await a.ctx.close();
  await b.ctx.close();
});

test('공개 프로필: 공개를 켜면 ?u=handle로 누구나 읽기 전용, 메모는 고른 경우만', async ({ browser }) => {
  const a = await device(browser);
  await a.page.evaluate(() =>
    (window as unknown as DevWindow).__db.settings.put({
      key: 'profile',
      value: { name: 'Sean', homeCityId: 'de-frankfurt', updatedAt: Date.now() },
    }),
  );
  await checkInBySearch(a.page, '프라하');
  await expect(a.page.getByText('프라하 도장 획득')).toBeVisible();
  await a.page.evaluate(async () => {
    const db = (window as unknown as DevWindow).__db;
    const [v] = await db.visits.toArray();
    await db.visits.update(v!.id, { note: '비밀 메모', updatedAt: Date.now() });
  });
  const sheet = await login(a.page, 'sean@example.com');
  await synced(a.page);

  await sheet.getByLabel('?u=').fill('sean_eu');
  await sheet.getByRole('button', { name: '저장' }).click();
  await expect(sheet.getByRole('switch', { name: '공개', exact: true })).toBeEnabled();
  await sheet.getByRole('switch', { name: '공개', exact: true }).check();
  await expect(sheet.getByRole('button', { name: '링크 복사' })).toBeVisible();

  // 로그인하지 않은 다른 사람
  const c = await device(browser);
  await c.page.goto('/?u=sean_eu');
  const pub = c.page.getByRole('region', { name: 'Sean의 공개 프로필' });
  await expect(pub.getByText('도장 1개')).toBeVisible({ timeout: 15_000 });
  await expect(pub.getByText('읽기 전용')).toBeVisible();
  await expect(pub.getByText('비밀 메모')).toHaveCount(0);
  // 내 진행률·프로필 버튼은 숨긴다
  await expect(c.page.getByRole('button', { name: '프로필' })).toHaveCount(0);

  // 메모 공개를 켜면 보인다
  await sheet.getByRole('switch', { name: '메모도 공개' }).check();
  await c.page.reload();
  await expect(pub.getByText('비밀 메모')).toBeVisible({ timeout: 15_000 });

  // 닫으면 내 지도
  await pub.getByRole('button', { name: '내 지도로 돌아가기' }).click();
  await expect(c.page.getByRole('button', { name: /어디 다녀오셨어요/ })).toBeVisible();

  // 없는 주소
  await c.page.goto('/?u=nobody_here');
  await expect(c.page.getByText('공개 프로필을 찾을 수 없어요', { exact: false })).toBeVisible();

  await a.ctx.close();
  await c.ctx.close();
});
