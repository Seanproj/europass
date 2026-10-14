// 데이터셋에 포함하는 나라 목록 (도시 데이터, 국기 퍼즐 공용)
// 제외: 러시아·벨라루스·튀르키예(대부분 유럽 밖이거나 여행 제약), 우크라이나·몰도바(도시 수 대비 방문 빈도 낮음),
// 바티칸(로마에 포함해 기록), 해외 영토와 왕실령(GI, IM, JE, GG, FO, AX, SJ)

export type RegionGroup = 'west' | 'central' | 'east' | 'south' | 'north' | 'british-isles' | 'balkans';

export const REGION_GROUP_KO: Record<RegionGroup, string> = {
  west: '서유럽',
  central: '중부유럽',
  east: '동유럽',
  south: '남유럽',
  north: '북유럽',
  'british-isles': '영국·아일랜드',
  balkans: '발칸',
};

export interface CountryMeta {
  code: string;
  ko: string;
  en: string;
  group: RegionGroup;
  /** 현지 이름을 고를 때 우선하는 언어 (Wikidata P1705) */
  langs: string[];
  /** world-atlas(Natural Earth) 속성 name. 여러 개면 합친다 */
  atlasNames: string[];
}

export const COUNTRIES: CountryMeta[] = [
  { code: 'AD', ko: '안도라', en: 'Andorra', group: 'south', langs: ['ca'], atlasNames: ['Andorra'] },
  { code: 'AL', ko: '알바니아', en: 'Albania', group: 'balkans', langs: ['sq'], atlasNames: ['Albania'] },
  { code: 'AT', ko: '오스트리아', en: 'Austria', group: 'central', langs: ['de'], atlasNames: ['Austria'] },
  {
    code: 'BA',
    ko: '보스니아 헤르체고비나',
    en: 'Bosnia and Herzegovina',
    group: 'balkans',
    langs: ['bs', 'hr', 'sr'],
    atlasNames: ['Bosnia and Herz.'],
  },
  {
    code: 'BE',
    ko: '벨기에',
    en: 'Belgium',
    group: 'west',
    langs: ['nl', 'fr', 'de'],
    atlasNames: ['Belgium'],
  },
  { code: 'BG', ko: '불가리아', en: 'Bulgaria', group: 'east', langs: ['bg'], atlasNames: ['Bulgaria'] },
  {
    code: 'CH',
    ko: '스위스',
    en: 'Switzerland',
    group: 'central',
    langs: ['de', 'fr', 'it', 'rm'],
    atlasNames: ['Switzerland'],
  },
  {
    code: 'CY',
    ko: '키프로스',
    en: 'Cyprus',
    group: 'south',
    langs: ['el', 'tr'],
    atlasNames: ['Cyprus', 'N. Cyprus'],
  },
  { code: 'CZ', ko: '체코', en: 'Czechia', group: 'east', langs: ['cs'], atlasNames: ['Czechia'] },
  { code: 'DE', ko: '독일', en: 'Germany', group: 'central', langs: ['de'], atlasNames: ['Germany'] },
  { code: 'DK', ko: '덴마크', en: 'Denmark', group: 'north', langs: ['da'], atlasNames: ['Denmark'] },
  { code: 'EE', ko: '에스토니아', en: 'Estonia', group: 'north', langs: ['et'], atlasNames: ['Estonia'] },
  {
    code: 'ES',
    ko: '스페인',
    en: 'Spain',
    group: 'south',
    langs: ['es', 'ca', 'eu', 'gl'],
    atlasNames: ['Spain'],
  },
  { code: 'FI', ko: '핀란드', en: 'Finland', group: 'north', langs: ['fi', 'sv'], atlasNames: ['Finland'] },
  { code: 'FR', ko: '프랑스', en: 'France', group: 'west', langs: ['fr'], atlasNames: ['France'] },
  {
    code: 'GB',
    ko: '영국',
    en: 'United Kingdom',
    group: 'british-isles',
    langs: ['en', 'cy', 'gd'],
    atlasNames: ['United Kingdom'],
  },
  { code: 'GR', ko: '그리스', en: 'Greece', group: 'south', langs: ['el'], atlasNames: ['Greece'] },
  { code: 'HR', ko: '크로아티아', en: 'Croatia', group: 'balkans', langs: ['hr'], atlasNames: ['Croatia'] },
  { code: 'HU', ko: '헝가리', en: 'Hungary', group: 'east', langs: ['hu'], atlasNames: ['Hungary'] },
  {
    code: 'IE',
    ko: '아일랜드',
    en: 'Ireland',
    group: 'british-isles',
    langs: ['en', 'ga'],
    atlasNames: ['Ireland'],
  },
  { code: 'IS', ko: '아이슬란드', en: 'Iceland', group: 'north', langs: ['is'], atlasNames: ['Iceland'] },
  { code: 'IT', ko: '이탈리아', en: 'Italy', group: 'south', langs: ['it'], atlasNames: ['Italy'] },
  {
    code: 'LI',
    ko: '리히텐슈타인',
    en: 'Liechtenstein',
    group: 'central',
    langs: ['de'],
    atlasNames: ['Liechtenstein'],
  },
  { code: 'LT', ko: '리투아니아', en: 'Lithuania', group: 'north', langs: ['lt'], atlasNames: ['Lithuania'] },
  {
    code: 'LU',
    ko: '룩셈부르크',
    en: 'Luxembourg',
    group: 'west',
    langs: ['lb', 'fr', 'de'],
    atlasNames: ['Luxembourg'],
  },
  { code: 'LV', ko: '라트비아', en: 'Latvia', group: 'north', langs: ['lv'], atlasNames: ['Latvia'] },
  { code: 'MC', ko: '모나코', en: 'Monaco', group: 'west', langs: ['fr'], atlasNames: ['Monaco'] },
  {
    code: 'ME',
    ko: '몬테네그로',
    en: 'Montenegro',
    group: 'balkans',
    langs: ['sr', 'cnr'],
    atlasNames: ['Montenegro'],
  },
  {
    code: 'MK',
    ko: '북마케도니아',
    en: 'North Macedonia',
    group: 'balkans',
    langs: ['mk'],
    atlasNames: ['Macedonia'],
  },
  { code: 'MT', ko: '몰타', en: 'Malta', group: 'south', langs: ['mt'], atlasNames: ['Malta'] },
  {
    code: 'NL',
    ko: '네덜란드',
    en: 'Netherlands',
    group: 'west',
    langs: ['nl'],
    atlasNames: ['Netherlands'],
  },
  {
    code: 'NO',
    ko: '노르웨이',
    en: 'Norway',
    group: 'north',
    langs: ['nb', 'nn', 'no'],
    atlasNames: ['Norway'],
  },
  { code: 'PL', ko: '폴란드', en: 'Poland', group: 'east', langs: ['pl'], atlasNames: ['Poland'] },
  { code: 'PT', ko: '포르투갈', en: 'Portugal', group: 'south', langs: ['pt'], atlasNames: ['Portugal'] },
  { code: 'RO', ko: '루마니아', en: 'Romania', group: 'east', langs: ['ro'], atlasNames: ['Romania'] },
  { code: 'RS', ko: '세르비아', en: 'Serbia', group: 'balkans', langs: ['sr'], atlasNames: ['Serbia'] },
  { code: 'SE', ko: '스웨덴', en: 'Sweden', group: 'north', langs: ['sv'], atlasNames: ['Sweden'] },
  { code: 'SI', ko: '슬로베니아', en: 'Slovenia', group: 'balkans', langs: ['sl'], atlasNames: ['Slovenia'] },
  { code: 'SK', ko: '슬로바키아', en: 'Slovakia', group: 'east', langs: ['sk'], atlasNames: ['Slovakia'] },
  { code: 'SM', ko: '산마리노', en: 'San Marino', group: 'south', langs: ['it'], atlasNames: ['San Marino'] },
  { code: 'XK', ko: '코소보', en: 'Kosovo', group: 'balkans', langs: ['sq', 'sr'], atlasNames: ['Kosovo'] },
];

export const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

/** 유럽 본토 + 대서양 섬(카나리아, 마데이라, 아조레스)만 남기는 범위. 해외 영토는 잘라낸다 */
export const EUROPE_BBOX = { minLon: -32, minLat: 27, maxLon: 45, maxLat: 72 } as const;
