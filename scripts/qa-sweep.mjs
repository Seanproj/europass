// 종합 점검: 모든 화면 × 뷰포트 × 테마에서 콘솔 오류, 실패한 요청, 가로 스크롤, 44px 미만 터치 영역, axe 위반
// 사용: npx vite --port 5180 (개발 서버, window.__db로 예시 기록을 넣는다) 를 띄우고
//       PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/qa-sweep.mjs <결과 폴더>
// 결과 폴더에 화면마다 스크린샷과 report.json. 지도 타일은 막지 않는다 (화면을 옮길 때 취소된 타일 요청 ERR_ABORTED는 정상)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5180';
const b = await chromium.launch();
const report = [];
const runs = [
  ['m360', 360, 740, 'light'],
  ['m390', 390, 844, 'light'],
  ['m390d', 390, 844, 'dark'],
  ['desk', 1280, 800, 'light'],
];

async function seed(p) {
  await p.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const g = c.getContext('2d');
    g.fillStyle = '#88a';
    g.fillRect(0, 0, 400, 300);
    const photo = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
    const row = (id, cityId, date, extra = {}) => ({
      id,
      cityId,
      date,
      note: '',
      photos: [],
      createdAt: 1,
      updatedAt: 1,
      ...extra,
    });
    await window.__db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    await window.__db.visits.bulkPut([
      row('a1', 'cz-prague', '2025-03-08', { note: '카를교 야경', photos: [photo] }),
      row('a2', 'cz-prague', '2026-09-20', { endDate: '2026-09-23' }),
      row('b1', 'fr-paris', '2026-05-01'),
      row('c1', 'at-vienna', '2026-06-01'),
      row('d1', 'ad-encamp', '2026-07-01'),
      row('e1', 'no-tromso', '2025-01-15'),
      row('f1', 'ba-sarajevo', '2024-08-10'),
      row('g1', 'lu-luxembourg', '2026-02-02'),
    ]);
  });
}

const screens = [
  ['01-home-empty', async (p) => {}],
  [
    '02-search',
    async (p) => {
      await p.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
      await p.waitForTimeout(500);
    },
  ],
  [
    '03-home',
    async (p) => {
      await seed(p);
      await p.goto(BASE + '/');
      await p.waitForFunction(() => window.__map?.loaded(), null, { timeout: 30000 });
      await p.waitForTimeout(2500);
    },
  ],
  [
    '04-home-half',
    async (p) => {
      await p.getByRole('button', { name: /^시트 크기 바꾸기/ }).click();
      await p.waitForTimeout(600);
    },
  ],
  [
    '05-home-cities',
    async (p) => {
      await p.getByRole('tab', { name: '도시' }).click();
      await p.waitForTimeout(400);
    },
  ],
  [
    '06-country',
    async (p) => {
      await p.goto(BASE + '/?country=CZ');
      await p.waitForTimeout(2500);
    },
  ],
  [
    '07-city',
    async (p) => {
      await p.goto(BASE + '/?city=cz-prague');
      await p.waitForTimeout(2500);
    },
  ],
  [
    '08-postcard',
    async (p) => {
      await p.getByRole('button', { name: /눌러서 엽서 보기/ }).click();
      await p.waitForTimeout(900);
    },
  ],
  [
    '09-city-full-editor',
    async (p) => {
      await p.getByRole('button', { name: /^시트 크기 바꾸기/ }).click();
      await p.waitForTimeout(300);
      const h = p.getByRole('button', { name: /^시트 크기 바꾸기/ });
      if (!(await h.getAttribute('aria-label')).includes('펼침)')) await h.click();
      await p.getByRole('button', { name: /2번째/ }).click();
      await p.waitForTimeout(500);
    },
  ],
  [
    '10-photo',
    async (p) => {
      await p.goto(BASE + '/?city=cz-prague');
      await p.waitForTimeout(1500);
      await p.getByRole('button', { name: '사진 1 보기' }).click();
      await p.waitForTimeout(700);
    },
  ],
  [
    '11-profile',
    async (p) => {
      await p.goto(BASE + '/?profile');
      await p.waitForTimeout(1800);
    },
  ],
  [
    '12-profile-book',
    async (p) => {
      await p.evaluate(() => document.getElementById('passport-title').scrollIntoView());
      await p.waitForTimeout(500);
    },
  ],
  [
    '13-settings',
    async (p) => {
      await p.getByRole('switch', { name: /도장 소리/ }).scrollIntoViewIfNeeded();
      await p.waitForTimeout(400);
    },
  ],
  [
    '14-share',
    async (p) => {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.getByRole('button', { name: '공유', exact: true }).click();
      await p.waitForTimeout(2500);
    },
  ],
  [
    '14b-score',
    async (p) => {
      await p.keyboard.press('Escape');
      await p.goto(BASE + '/?profile');
      await p.getByRole('button', { name: /계산 보기/ }).click();
      await p.waitForTimeout(600);
    },
  ],
  [
    '14c-celebration',
    async (p) => {
      await p.goto(BASE + '/');
      await p.waitForFunction(() => window.__map?.loaded(), null, { timeout: 30000 });
      await p.getByRole('button', { name: /어디 다녀오셨어요/ }).click();
      await p.getByRole('searchbox', { name: '도시 검색' }).fill('베를린');
      await p.getByRole('list', { name: '검색 결과' }).getByRole('button').first().click();
      await p.getByTestId('celebration').waitFor({ timeout: 10000 });
      await p.waitForTimeout(1500);
    },
  ],
  [
    '15-wrap',
    async (p) => {
      await p.goto(BASE + '/?wrap=2026');
      await p.waitForTimeout(2500);
    },
  ],
];

for (const [tag, w, h, theme] of runs) {
  // 여권 발급 오프닝 (빈 브라우저): 표지와 신원 페이지
  {
    const ictx = await b.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      colorScheme: theme,
      hasTouch: tag !== 'desk',
      isMobile: tag !== 'desk',
    });
    const ip = await ictx.newPage();
    await ip.goto(BASE + '/');
    const cover = ip.getByRole('button', { name: /눌러서 여권 받기/ });
    await cover.waitFor({ timeout: 30000 });
    await ip.waitForTimeout(900);
    await ip.screenshot({ path: `${OUT}/${tag}-00-intro-cover.png` });
    await cover.click();
    await ip.waitForTimeout(900);
    const r = await new AxeBuilder({ page: ip }).withTags(['wcag2a', 'wcag2aa']).analyze();
    report.push({
      tag,
      name: '00-intro',
      overflow: await ip.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      small: [],
      axe: r.violations.map((v) => `${v.id}(${v.nodes.length})`),
      errors: [],
    });
    await ip.screenshot({ path: `${OUT}/${tag}-00-intro-id.png` });
    await ictx.close();
  }
  const ctx = await b.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    colorScheme: theme,
    hasTouch: tag !== 'desk',
    isMobile: tag !== 'desk',
  });
  await ctx.addInitScript(() => localStorage.setItem('euro-passport:intro-seen', '1'));
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160));
  });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 160)));
  p.on('requestfailed', (r) => {
    if (!r.url().includes('localhost'))
      errors.push('REQFAIL ' + r.url().slice(0, 90) + ' ' + r.failure()?.errorText);
  });
  await p.goto(BASE + '/');
  await p.waitForFunction(() => window.__map?.loaded(), null, { timeout: 30000 });
  await p.waitForTimeout(2000);
  for (const [name, act] of screens) {
    const before = errors.length;
    try {
      await act(p);
    } catch (e) {
      report.push({ tag, name, step: 'ACTION FAILED ' + String(e).split('\n')[0].slice(0, 150) });
      continue;
    }
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const small = await p.evaluate(() =>
      [...document.querySelectorAll('button, a, input, [role=switch], [role=tab]')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return (
            r.width > 0 &&
            r.height > 0 &&
            s.visibility !== 'hidden' &&
            r.bottom > 0 &&
            r.top < innerHeight &&
            (r.width < 43.5 || r.height < 43.5) &&
            !el.closest('[aria-hidden=true]') &&
            el.getAttribute('type') !== 'file'
          );
        })
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}] ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
        ),
    );
    let axe = [];
    try {
      const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze();
      axe = r.violations.map((v) => `${v.id}(${v.nodes.length})`);
    } catch (e) {
      axe = ['axe failed'];
    }
    await p.screenshot({ path: `${OUT}/${tag}-${name}.png` });
    report.push({
      tag,
      name,
      overflow,
      small: [...new Set(small)].slice(0, 8),
      axe,
      errors: errors.slice(before),
    });
  }
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) {
  const issues = [];
  if (r.step) issues.push(r.step);
  if (r.overflow > 0) issues.push(`가로넘침 ${r.overflow}px`);
  if (r.small?.length) issues.push(`작은터치 ${r.small.join(', ')}`);
  if (r.axe?.length) issues.push(`axe ${r.axe.join(' ')}`);
  if (r.errors?.length) issues.push(`오류 ${[...new Set(r.errors)].join(' | ')}`);
  console.log(`${r.tag} ${r.name}: ${issues.length ? issues.join(' / ') : 'OK'}`);
}
