import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { cityCardData, countryCardData, milestoneCardData, summaryCardData, wrapData } from './cardData';
import { RecordingContext, summarize } from './recorder';
import {
  drawCityCard,
  drawCountryCard,
  drawFeedCard,
  drawMilestoneCard,
  drawStoryCard,
  drawWrapSlide,
  wrapAlt,
  wrapSlides,
} from './render';
import type { CardTheme } from './theme';

const THEME: CardTheme = {
  bg: 'bg',
  surface: 'surface',
  text: 'text',
  text2: 'text2',
  line: 'line',
  accent: 'accent',
  onAccent: 'onAccent',
  gold: 'gold',
  land: 'land',
  flagBlack: 'flagBlack',
  font: 'Sans',
  mono: 'Mono',
};
const PROFILE = { name: 'Sean', homeCityId: 'de-frankfurt' };
const TODAY = '2026-10-14';
const img = (label: string, width = 800, height = 600) =>
  ({ label, width, height }) as unknown as CanvasImageSource;

let n = 0;
const visit = (cityId: string, date: string, photos: Blob[] = []): Visit => ({
  id: `v${++n}`,
  cityId,
  date,
  note: '',
  photos,
  createdAt: n,
  updatedAt: n,
});

const VISITS: Visit[] = [
  visit('cz-prague', '2026-03-08'),
  visit('cz-prague', '2026-09-20', [new Blob(['x'], { type: 'image/jpeg' })]),
  visit('cz-prague', '2025-12-20'),
  visit('cz-brno', '2026-09-21'),
  visit('fr-paris', '2026-05-01'),
  visit('at-vienna', '2026-09-08'),
  visit('no-tromso', '2026-01-15'),
  visit('lu-luxembourg', '2026-07-01'),
  visit('lu-echternach', '2026-07-02'),
  visit('lu-vianden', '2026-07-03'),
];

function record(draw: (ctx: RecordingContext) => void) {
  const ctx = new RecordingContext();
  draw(ctx);
  return ctx;
}

describe('공유 카드 렌더 (그리기 호출 스냅샷)', () => {
  it('피드 4:5', () => {
    const ctx = record((c) => drawFeedCard(c, summaryCardData(VISITS, PROFILE, TODAY), THEME, img('map')));
    const s = summarize(ctx.ops);
    expect(s).toMatchSnapshot();
    // 숫자 3개, 최근 도장 6개(도장마다 도시 이름), 이름과 날짜
    expect(s.content.some((op) => op.includes('"Sean의 유럽"'))).toBe(true);
    expect(s.content.some((op) => op.includes('2026.10.14'))).toBe(true);
    expect(s.content.filter((op) => op.includes('"PRAHA"'))).toHaveLength(1);
    expect(s.content[0]).toContain('drawImage("map"');
  });

  it('스토리 9:16', () => {
    const ctx = record((c) => drawStoryCard(c, summaryCardData(VISITS, PROFILE, TODAY), THEME, null));
    expect(summarize(ctx.ops)).toMatchSnapshot();
  });

  it('기록이 없을 때', () => {
    const ctx = record((c) => drawFeedCard(c, summaryCardData([], PROFILE, TODAY), THEME, null));
    expect(summarize(ctx.ops).content).toContain('fillText("첫 도장을 기다리는 중", 540, 1030)');
  });

  it('국가 카드: 완성한 나라는 "완성" 표시', () => {
    const lu = countryCardData('LU', VISITS, 'Sean', TODAY);
    expect(lu.complete).toBe(true);
    const puzzle = { width: 840, height: 460, regions: [], pieces: [] };
    const done = record((c) => drawCountryCard(c, lu, THEME, { flag: img('flag-lu'), puzzle }));
    expect(summarize(done.ops)).toMatchSnapshot();
    expect(summarize(done.ops).content).toContain('fillText("완성", 933, 143)');

    const cz = countryCardData('CZ', VISITS, 'Sean', TODAY);
    expect(cz.complete).toBe(false);
    const part = record((c) => drawCountryCard(c, cz, THEME, { flag: null, puzzle: null }));
    expect(summarize(part.ops).content.some((op) => op.includes('"완성"'))).toBe(false);
  });

  it('도시 카드: "프라하와 나 · 3번의 방문", 날짜들, 사진', () => {
    const d = cityCardData('cz-prague', VISITS, 'Sean', TODAY)!;
    expect(d.visits.map((v) => v.date)).toEqual(['2025-12-20', '2026-03-08', '2026-09-20']);
    expect(d.photo).toBeInstanceOf(Blob);
    const ctx = record((c) => drawCityCard(c, d, THEME, img('photo')));
    const s = summarize(ctx.ops);
    expect(s).toMatchSnapshot();
    expect(s.content).toContain('fillText("프라하와 나", 72, 652)');
    expect(s.content).toContain('fillText("3번의 방문 · 체코", 72, 714)');
    // 받침 있는 이름은 "과"
    const berlin = cityCardData('de-berlin', [visit('de-berlin', '2026-01-01')], 'Sean', TODAY)!;
    const b = record((c) => drawCityCard(c, berlin, THEME, null));
    expect(summarize(b.ops).content.some((op) => op.includes('"베를린과 나"'))).toBe(true);
  });
});

describe('기념 카드', () => {
  const stampAt = { cityId: 'lu-vianden', visit: { id: 'v-lu', date: '2026-07-03' }, nth: 1 };

  it('국기 완성: 큰 국기 + 제목 + 함께 이룬 기념 + 그 순간의 도장', () => {
    const d = milestoneCardData(
      [
        { id: 'flag:LU', kind: 'flag', country: 'LU', pieces: 3 },
        { id: 'count:10', kind: 'count', count: 10 },
      ],
      stampAt,
      'Sean',
      '2026-07-03',
    )!;
    const s = summarize(record((c) => drawMilestoneCard(c, d, THEME, img('flag-lu'))).ops);
    expect(s).toMatchSnapshot();
    expect(s.content).toContain('fillText("국기 완성", 540, 139)');
    expect(s.content).toContain('fillText("룩셈부르크 국기 완성", 540, 700)');
    expect(s.content).toContain('fillText("조각 3개를 모두 모았어요 · 10번째 도장", 540, 770)');
    expect(s.content.some((op) => op.includes('drawImage("flag-lu"'))).toBe(true);
    expect(s.content.some((op) => op.includes('"VEIANEN"'))).toBe(true);
  });

  it('도장 개수: 국기 대신 큰 숫자', () => {
    const d = milestoneCardData([{ id: 'count:25', kind: 'count', count: 25 }], stampAt, 'Sean', TODAY)!;
    const s = summarize(record((c) => drawMilestoneCard(c, d, THEME, null)).ops);
    expect(s.content).toContain('fillText("25", 540, 510)');
    expect(s.content).toContain('fillText("25번째 도장", 540, 700)');
    expect(s.content.some((op) => op.includes('drawImage'))).toBe(false);
  });

  it('기념이 없거나 모르는 도시면 카드를 만들지 않는다', () => {
    expect(milestoneCardData([], stampAt, 'Sean', TODAY)).toBeNull();
    const nowhere = { ...stampAt, cityId: 'xx-nowhere' };
    expect(
      milestoneCardData([{ id: 'count:10', kind: 'count', count: 10 }], nowhere, 'Sean', TODAY),
    ).toBeNull();
  });
});

describe('연말 결산', () => {
  const d = wrapData(VISITS, 2026, PROFILE);

  it('올해 기록만 센다', () => {
    expect(d).toMatchObject({ visits: 9, cities: 8, countries: 5 });
    expect(d.farthest?.city.id).toBe('no-tromso');
    // 체코와 룩셈부르크 모두 3번이면 도시가 많은 쪽
    expect(d.topCountry).toMatchObject({ code: 'LU', visits: 3, cities: 3 });
    expect(d.months).toEqual([1, 0, 1, 0, 1, 0, 3, 0, 3, 0, 0, 0]);
    // 도시마다 올해 첫 도장, 날짜순
    expect(d.collection.map((s) => s.city.id)).toEqual([
      'no-tromso',
      'cz-prague',
      'fr-paris',
      'lu-luxembourg',
      'lu-echternach',
      'lu-vianden',
      'at-vienna',
      'cz-brno',
    ]);
  });

  it.each(wrapSlides(d))('%s', (slide) => {
    const ctx = record((c) => drawWrapSlide(c, slide, d, THEME, { flag: img('flag') }));
    expect(summarize(ctx.ops)).toMatchSnapshot();
  });

  it('장마다 읽어 줄 글', () => {
    expect(wrapAlt('numbers', d)).toBe(`2026년의 여행: 도시 8곳, 나라 5개, 방문 9번, 유럽에서 ${d.days}일`);
    expect(wrapAlt('farthest', d)).toMatch(/^가장 먼 곳: 트롬쇠, 프랑크푸르트에서 [\d,]+km$/);
    expect(wrapAlt('country', d)).toBe('가장 많이 간 나라: 룩셈부르크, 3번 방문, 도시 3곳');
    expect(wrapAlt('months', d)).toContain('7월 3번');
    expect(wrapAlt('collection', d)).toContain('올해의 도장 8개: 트롬쇠, 프라하');
  });

  it('출발지를 정하지 않으면 "가장 먼 곳" 장이 없고, 한국이면 서울 기준 거리', () => {
    const none = wrapData(VISITS, 2026, { ...PROFILE, homeCityId: '' });
    expect(none.farthest).toBeNull();
    expect(wrapSlides(none)).toEqual(['numbers', 'country', 'months', 'collection']);
    const kr = wrapData(VISITS, 2026, { ...PROFILE, homeCityId: 'kr' });
    expect(kr.farthest).not.toBeNull();
    expect(wrapAlt('farthest', kr)).toMatch(/^가장 먼 곳: .+, 한국에서 [\d,]+km$/);
    expect(kr.farthest!.km).toBeGreaterThan(8000);
  });

  it('기록 없는 해는 첫 장 하나', () => {
    const empty = wrapData(VISITS, 2020, PROFILE);
    expect(wrapSlides(empty)).toEqual(['numbers']);
    const ctx = record((c) => drawWrapSlide(c, 'numbers', empty, THEME, { flag: null }));
    expect(summarize(ctx.ops).content).toContain('fillText("올해는 아직 기록이 없어요", 72, 520)');
  });
});
