import { expect, test, type Page } from '@playwright/test';

/** 개발 서버가 노출하는 지도·DB (src/features/map/MapView.tsx) */
type DevWindow = Window & {
  __map: { getZoom(): number; getCenter(): { lng: number; lat: number }; loaded(): boolean };
  __db: { visits: { where(k: string): { equals(v: string): { count(): Promise<number> } } } };
};

const pragueVisits = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as DevWindow).__db.visits.where('cityId').equals('cz-prague').count(),
  );

async function openApp(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as DevWindow).__map?.loaded(), null, {
    timeout: 30_000,
  });
}

/** 탭 1: 검색창 → "ㅍㄹㅎ" 입력. 첫 결과(프라하) 버튼을 돌려준다 */
async function searchPrague(page: Page) {
  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  const input = page.getByRole('searchbox', { name: '도시 검색' });
  await expect(input).toBeFocused();
  await input.fill('ㅍㄹㅎ');
  const first = page.getByRole('list', { name: '검색 결과' }).getByRole('button').first();
  await expect(first).toContainText('프라하');
  return first;
}

test('"ㅍㄹㅎ" 검색 → 프라하 체크인 → 지도에 열림 → 되돌리기 → 원상복구', async ({ page }, info) => {
  await openApp(page);
  expect(await pragueVisits(page)).toBe(0);
  await expect(page.getByLabel('0개 도시, 0개국 방문')).toBeVisible();

  // 탭 2: 결과 → 즉시 도장, 시트는 도시 상세
  await (await searchPrague(page)).click();
  await expect(page.getByTestId('stamp-burst')).toBeVisible();
  await expect(page.getByText('프라하 도장 획득')).toBeVisible();
  await expect(page.getByRole('heading', { name: '프라하' })).toBeVisible();
  expect(await pragueVisits(page)).toBe(1);
  await expect(page.getByLabel('1개 도시, 1개국 방문')).toBeVisible();

  // 지도가 프라하로 이동했다
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const m = (window as unknown as DevWindow).__map;
        const c = m.getCenter();
        return m.getZoom() > 8 && Math.abs(c.lng - 14.42) < 1.5 && Math.abs(c.lat - 50) < 3;
      }),
    )
    .toBe(true);
  await page.waitForTimeout(900);
  await page.screenshot({ path: info.outputPath('checkin-opened.png') });

  // 되돌리기 → 기록이 사라지고 진행률도 원래대로
  await page.getByRole('button', { name: '되돌리기' }).click();
  await expect.poll(() => pragueVisits(page)).toBe(0);
  await expect(page.getByLabel('0개 도시, 0개국 방문')).toBeVisible();
  await expect(page.getByText('프라하 도장 획득')).toBeHidden();
  await page.screenshot({ path: info.outputPath('after-undo.png') });
});

test('도장 "쾅" 애니메이션 중간 프레임', async ({ page }, info) => {
  // 가상 시계로 260ms 스프링의 중간(130ms)에서 멈춰 찍는다
  await page.clock.install();
  await openApp(page);
  const first = await searchPrague(page);
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await first.click();
  await page.clock.runFor(130);
  await expect(page.getByTestId('stamp-burst')).toBeVisible();
  await page.screenshot({ path: info.outputPath('checkin-mid.png') });
});
