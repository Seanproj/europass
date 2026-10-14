/** 도장 뒷면 엽서 (Phase 11): 도시 상세 맨 위 도장을 누르면 가장 최근 방문의 엽서로 뒤집힌다 */
import { expect, test } from '@playwright/test';
import { makeJpeg, openApp, seed, type DevWindow } from './support/app';

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`도장 ↔ 엽서 뒤집기 (움직임: ${motion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await openApp(page);
    await seed(page);
    await page.goto('/?city=cz-prague');

    const card = page.getByRole('button', { name: '프라하 도장, 눌러서 엽서 보기' });
    await expect(card).toHaveAttribute('aria-pressed', 'false');
    await card.click();
    const back = page.getByRole('button', { name: '프라하 엽서, 눌러서 도장 보기' });
    await expect(back).toHaveAttribute('aria-pressed', 'true');

    // 가장 최근 방문(2026-09-20, 메모·사진 없음)의 엽서
    const postcard = page.getByTestId('postcard');
    await expect(postcard).toContainText('프라하에서');
    await expect(postcard).toContainText('2026.09.20 · 당일');
    await expect(postcard).toContainText('사진을 넣으면');
    await expect(postcard).toContainText('한 줄을 남겨 보세요');

    // 메모와 사진을 남기면 엽서에 바로 보인다
    const jpeg = await makeJpeg(page);
    await page.evaluate(
      async (bytes) => {
        const photo = new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
        await (window as unknown as DevWindow).__db.visits.update('p2', {
          note: '블타바 강 노을',
          photos: [photo],
          updatedAt: Date.now(),
        });
      },
      [...jpeg],
    );
    await expect(postcard).toContainText('블타바 강 노을');
    await expect(postcard.locator('img')).toHaveCount(1);
    await expect(postcard).not.toContainText('사진을 넣으면');

    await back.click();
    await expect(page.getByRole('button', { name: '프라하 도장, 눌러서 엽서 보기' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
}
