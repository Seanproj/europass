/** 검색: 나라 이름(한글·영어)으로 그 나라 도시들, 한/영 전환을 잊은 입력도 찾는다 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openApp } from './support/app';

test('나라 이름으로 찾으면 그 나라 도시가 큰 도시부터, 한/영 오타도 찾는다', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
  const input = page.getByRole('searchbox', { name: '도시 검색' });
  const results = page.getByRole('list', { name: '검색 결과' });

  for (const q of ['독일', 'germany']) {
    await input.fill(q);
    await expect(results.getByText('독일의 도시 · 큰 도시부터')).toBeVisible();
    await expect(results.getByRole('button').first()).toContainText('베를린');
  }

  // 나라 묶음 머리글이 목록 구조를 깨지 않는다
  const axe = await new AxeBuilder({ page })
    .include('[aria-label="검색 결과"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  // 도시 이름이 맞으면 그 도시가 먼저, 나머지는 나라 묶음으로
  await input.fill('룩셈부르크');
  await expect(results.getByRole('button').first()).toContainText('룩셈부르크');
  await expect(results.getByText('룩셈부르크의 도시 · 큰 도시부터')).toBeVisible();

  // 영문 자판으로 "파리"를 친 경우
  await input.fill('vkfl');
  await expect(results.getByRole('button').first()).toContainText('파리');
  // 고른 결과로 체크인까지
  await results.getByRole('button').first().click();
  await expect(page.getByText('파리 도장 획득')).toBeVisible();
});
