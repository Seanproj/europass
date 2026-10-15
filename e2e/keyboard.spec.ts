/**
 * 검색 중 키보드 (iOS Safari 피드백): 키보드가 뜨면 보이는 화면(visualViewport)만 줄어들어
 * 바닥에 붙은 시트가 키보드 뒤로 숨고, 다시 검색할 때 입력한 글자·결과가 안 보였다.
 * 크로미움에는 화면 키보드가 없어서 visualViewport의 높이를 iOS처럼 흉내 낸다
 * (Playwright도 visualViewport를 보므로 클릭을 다 한 뒤에 켠다)
 */
import { expect, test, type Page } from '@playwright/test';
import { checkInBySearch, openApp } from './support/app';

const KEYBOARD = 336;

/** 키보드를 띄운 것처럼: 보이는 화면 높이를 줄이고 resize 이벤트 */
function setKeyboard(page: Page, px: number) {
  return page.evaluate((px) => {
    const vv = window.visualViewport!;
    Object.defineProperty(vv, 'height', { configurable: true, get: () => window.innerHeight - px });
    vv.dispatchEvent(new Event('resize'));
  }, px);
}

test('키보드가 떠도 검색창과 결과가 키보드 위에 보인다 (두 번째 검색도)', async ({ page }) => {
  await openApp(page);
  await checkInBySearch(page, '마드리드');
  await expect(page.getByText('마드리드 도장 획득')).toBeVisible();
  await page.getByTestId('celebration').getByRole('button', { name: '닫기' }).click();

  // 도시 상세에서 뒤로 → 홈에서 다시 검색
  await page.getByRole('button', { name: '뒤로' }).first().click();
  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  await setKeyboard(page, KEYBOARD);
  const input = page.getByRole('searchbox', { name: '도시 검색' });
  await input.fill('베를');
  await expect(input).toHaveValue('베를');

  const visible = (await page.evaluate(() => window.innerHeight)) - KEYBOARD;
  const first = page.getByRole('list', { name: '검색 결과' }).getByRole('button').first();
  await expect(first).toBeVisible();
  await expect
    .poll(async () => {
      const [a, b] = await Promise.all([input.boundingBox(), first.boundingBox()]);
      return Math.max(a!.y + a!.height, b!.y + b!.height) <= visible;
    })
    .toBe(true);

  // 키보드가 내려가면 시트도 원래 자리로
  await setKeyboard(page, 0);
  const sheet = page.getByRole('region', { name: '나의 유럽' });
  await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).bottom)).toBe('0px');
});
