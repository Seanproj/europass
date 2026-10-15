/**
 * 시작 화면: 처음 쓰는 사람은 여권 발급 오프닝(표지 → 신원 페이지 → 발급 도장 → 첫 도장),
 * 기록이 있으면 그날 처음 열 때 인사 한 줄 (안개 리플레이와 함께)
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openApp, seed, type DevWindow } from './support/app';

/** 오프닝 화면만 WCAG 2.1 AA 검사 */
async function axe(page: Page) {
  const r = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test.describe('여권 발급 오프닝 (빈 브라우저)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('표지 → 이름·출발지 → 발급 → 도시 검색으로 이어지고, 다시 열면 나오지 않는다', async ({ page }) => {
    await openApp(page);
    const intro = page.getByRole('dialog', { name: /EURO\s*PASSPORT/ });
    await expect(intro).toBeVisible();
    // 표지가 다 나타난 뒤 (나타나는 중의 반투명 글자를 대비 부족으로 잡지 않게)
    await page.waitForTimeout(700);
    expect(await axe(page)).toEqual([]);
    await intro.getByRole('button', { name: /눌러서 여권 받기/ }).click();

    const id = page.getByRole('dialog', { name: '여권을 발급할게요' });
    await expect(id).toBeVisible();
    await page.waitForTimeout(700);
    expect(await axe(page)).toEqual([]);
    await id.getByLabel('이름').fill('Sean');
    await id.getByRole('button', { name: '한국' }).click();
    await id.getByRole('button', { name: '여권 발급' }).click();
    await expect(id.getByRole('img', { name: '발급 도장' })).toBeVisible();

    const first = page.getByRole('dialog', { name: '첫 도장을 찍을 차례예요' });
    await expect(first).toBeVisible();
    await page.waitForTimeout(700);
    expect(await axe(page)).toEqual([]);
    await first.getByRole('button', { name: '다녀온 도시 검색' }).click();
    await expect(first).toBeHidden();
    await expect(page.getByRole('searchbox', { name: '도시 검색' })).toBeFocused();

    // 이름과 출발지가 저장됐다
    await page.goto('/?profile');
    await expect(page.getByRole('main', { name: 'Sean' })).toBeVisible();
    await expect(page.getByText('한국에서 출발')).toBeVisible();
    // 다시 열어도 오프닝은 없다
    await openApp(page);
    await expect(page.getByRole('dialog', { name: /EURO\s*PASSPORT/ })).toHaveCount(0);
  });

  test('건너뛰기는 바로 지도로, 다시 나오지 않는다', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '건너뛰기' }).click();
    await expect(page.getByRole('dialog', { name: /EURO\s*PASSPORT/ })).toBeHidden();
    await expect(page.getByRole('button', { name: /어디 다녀오셨어요/ })).toBeVisible();
    await openApp(page);
    await expect(page.getByRole('dialog', { name: /EURO\s*PASSPORT/ })).toHaveCount(0);
  });
});

test.describe('첫 도장: 현재 위치', () => {
  test.use({
    storageState: { cookies: [], origins: [] },
    geolocation: { latitude: 50.087, longitude: 14.421 },
    permissions: ['geolocation'],
  });

  test('가까운 도시를 찾아 바로 첫 도장을 찍는다', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /눌러서 여권 받기/ }).click();
    await page.getByRole('button', { name: '여권 발급' }).click();
    const first = page.getByRole('dialog', { name: '첫 도장을 찍을 차례예요' });
    await first.getByRole('button', { name: '현재 위치로 찾기' }).click();
    await expect(first.getByText('프라하 근처에 계시네요')).toBeVisible();
    await first.getByRole('button', { name: '여기서 첫 도장 찍기' }).click();
    await expect(first).toBeHidden();
    await expect(page.getByText('프라하 도장 획득')).toBeVisible();
    await expect(page.getByTestId('celebration')).toContainText('체코 첫 도장');
  });
});

test('다시 연 날: 하루 한 번 인사 한 줄', async ({ page }) => {
  await openApp(page);
  await seed(page);
  // 어제 마지막으로 열었던 것으로
  await page.evaluate(() =>
    (window as unknown as DevWindow).__db.settings.put({ key: 'lastOpened', value: '2000-01-01' }),
  );
  await openApp(page);
  await expect(page.getByText(/^다시 오셨네요 · 마지막 여행 .+ · 여권 점수 [\d,]+$/)).toBeVisible();
  // 같은 날 다시 열면 없다
  await openApp(page);
  await page.waitForTimeout(1500);
  await expect(page.getByText(/^다시 오셨네요/)).toHaveCount(0);
});
