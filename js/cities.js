// 유럽 주요 도시 데이터
// region: west | central | south | north | east | uk
// capital: 수도 여부 (배지 계산용)
export const CITIES = [
  // 🇩🇪 독일 — 홈그라운드
  { id: 'berlin', ko: '베를린', en: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405, region: 'central', capital: true, emoji: '🐻' },
  { id: 'munich', ko: '뮌헨', en: 'München', country: 'DE', lat: 48.137, lon: 11.575, region: 'central', emoji: '🍺' },
  { id: 'hamburg', ko: '함부르크', en: 'Hamburg', country: 'DE', lat: 53.551, lon: 9.993, region: 'central', emoji: '⚓' },
  { id: 'frankfurt', ko: '프랑크푸르트', en: 'Frankfurt', country: 'DE', lat: 50.11, lon: 8.682, region: 'central', emoji: '🏙️' },
  { id: 'cologne', ko: '쾰른', en: 'Köln', country: 'DE', lat: 50.938, lon: 6.96, region: 'central', emoji: '⛪' },
  { id: 'dresden', ko: '드레스덴', en: 'Dresden', country: 'DE', lat: 51.05, lon: 13.738, region: 'central', emoji: '🎻' },
  { id: 'heidelberg', ko: '하이델베르크', en: 'Heidelberg', country: 'DE', lat: 49.398, lon: 8.672, region: 'central', emoji: '🏰' },

  // 서유럽
  { id: 'paris', ko: '파리', en: 'Paris', country: 'FR', lat: 48.857, lon: 2.352, region: 'west', capital: true, emoji: '🗼' },
  { id: 'nice', ko: '니스', en: 'Nice', country: 'FR', lat: 43.71, lon: 7.262, region: 'south', emoji: '🏖️' },
  { id: 'lyon', ko: '리옹', en: 'Lyon', country: 'FR', lat: 45.764, lon: 4.836, region: 'west', emoji: '🥐' },
  { id: 'amsterdam', ko: '암스테르담', en: 'Amsterdam', country: 'NL', lat: 52.368, lon: 4.904, region: 'west', capital: true, emoji: '🚲' },
  { id: 'brussels', ko: '브뤼셀', en: 'Bruxelles', country: 'BE', lat: 50.85, lon: 4.352, region: 'west', capital: true, emoji: '🧇' },
  { id: 'bruges', ko: '브뤼헤', en: 'Brugge', country: 'BE', lat: 51.209, lon: 3.225, region: 'west', emoji: '🛶' },
  { id: 'luxembourg', ko: '룩셈부르크', en: 'Luxembourg', country: 'LU', lat: 49.611, lon: 6.13, region: 'west', capital: true, emoji: '🏦' },

  // 영국·아일랜드
  { id: 'london', ko: '런던', en: 'London', country: 'GB', lat: 51.507, lon: -0.128, region: 'uk', capital: true, emoji: '💂' },
  { id: 'edinburgh', ko: '에든버러', en: 'Edinburgh', country: 'GB', lat: 55.953, lon: -3.188, region: 'uk', emoji: '🏴' },
  { id: 'dublin', ko: '더블린', en: 'Dublin', country: 'IE', lat: 53.35, lon: -6.26, region: 'uk', capital: true, emoji: '☘️' },

  // 중부유럽
  { id: 'vienna', ko: '빈', en: 'Wien', country: 'AT', lat: 48.208, lon: 16.373, region: 'central', capital: true, emoji: '🎼' },
  { id: 'salzburg', ko: '잘츠부르크', en: 'Salzburg', country: 'AT', lat: 47.81, lon: 13.055, region: 'central', emoji: '🎶' },
  { id: 'hallstatt', ko: '할슈타트', en: 'Hallstatt', country: 'AT', lat: 47.562, lon: 13.649, region: 'central', emoji: '🏔️' },
  { id: 'zurich', ko: '취리히', en: 'Zürich', country: 'CH', lat: 47.377, lon: 8.541, region: 'central', emoji: '🧀' },
  { id: 'interlaken', ko: '인터라켄', en: 'Interlaken', country: 'CH', lat: 46.686, lon: 7.863, region: 'central', emoji: '⛷️' },
  { id: 'prague', ko: '프라하', en: 'Praha', country: 'CZ', lat: 50.075, lon: 14.438, region: 'east', capital: true, emoji: '🕰️' },
  { id: 'budapest', ko: '부다페스트', en: 'Budapest', country: 'HU', lat: 47.498, lon: 19.04, region: 'east', capital: true, emoji: '♨️' },
  { id: 'krakow', ko: '크라쿠프', en: 'Kraków', country: 'PL', lat: 50.065, lon: 19.945, region: 'east', emoji: '🐉' },
  { id: 'warsaw', ko: '바르샤바', en: 'Warszawa', country: 'PL', lat: 52.23, lon: 21.012, region: 'east', capital: true, emoji: '🧜' },
  { id: 'ljubljana', ko: '류블랴나', en: 'Ljubljana', country: 'SI', lat: 46.056, lon: 14.506, region: 'east', capital: true, emoji: '🐲' },

  // 남유럽
  { id: 'rome', ko: '로마', en: 'Roma', country: 'IT', lat: 41.903, lon: 12.496, region: 'south', capital: true, emoji: '🏛️' },
  { id: 'florence', ko: '피렌체', en: 'Firenze', country: 'IT', lat: 43.77, lon: 11.256, region: 'south', emoji: '🎨' },
  { id: 'venice', ko: '베네치아', en: 'Venezia', country: 'IT', lat: 45.441, lon: 12.316, region: 'south', emoji: '🛶' },
  { id: 'milan', ko: '밀라노', en: 'Milano', country: 'IT', lat: 45.464, lon: 9.19, region: 'south', emoji: '👗' },
  { id: 'barcelona', ko: '바르셀로나', en: 'Barcelona', country: 'ES', lat: 41.385, lon: 2.173, region: 'south', emoji: '🥘' },
  { id: 'madrid', ko: '마드리드', en: 'Madrid', country: 'ES', lat: 40.417, lon: -3.704, region: 'south', capital: true, emoji: '💃' },
  { id: 'seville', ko: '세비야', en: 'Sevilla', country: 'ES', lat: 37.389, lon: -5.984, region: 'south', emoji: '🍊' },
  { id: 'lisbon', ko: '리스본', en: 'Lisboa', country: 'PT', lat: 38.722, lon: -9.139, region: 'south', capital: true, emoji: '🚋' },
  { id: 'porto', ko: '포르투', en: 'Porto', country: 'PT', lat: 41.158, lon: -8.629, region: 'south', emoji: '🍷' },
  { id: 'athens', ko: '아테네', en: 'Athína', country: 'GR', lat: 37.984, lon: 23.728, region: 'south', capital: true, emoji: '🏺' },
  { id: 'santorini', ko: '산토리니', en: 'Santorini', country: 'GR', lat: 36.393, lon: 25.461, region: 'south', emoji: '🌅' },
  { id: 'dubrovnik', ko: '두브로브니크', en: 'Dubrovnik', country: 'HR', lat: 42.65, lon: 18.094, region: 'south', emoji: '🏯' },
  { id: 'malta', ko: '발레타', en: 'Valletta', country: 'MT', lat: 35.899, lon: 14.514, region: 'south', capital: true, emoji: '⛵' },

  // 북유럽
  { id: 'copenhagen', ko: '코펜하겐', en: 'København', country: 'DK', lat: 55.676, lon: 12.568, region: 'north', capital: true, emoji: '🧜‍♀️' },
  { id: 'stockholm', ko: '스톡홀름', en: 'Stockholm', country: 'SE', lat: 59.329, lon: 18.069, region: 'north', capital: true, emoji: '👑' },
  { id: 'oslo', ko: '오슬로', en: 'Oslo', country: 'NO', lat: 59.914, lon: 10.752, region: 'north', capital: true, emoji: '🛷' },
  { id: 'bergen', ko: '베르겐', en: 'Bergen', country: 'NO', lat: 60.391, lon: 5.322, region: 'north', emoji: '🏞️' },
  { id: 'helsinki', ko: '헬싱키', en: 'Helsinki', country: 'FI', lat: 60.17, lon: 24.938, region: 'north', capital: true, emoji: '🧖' },
  { id: 'reykjavik', ko: '레이캬비크', en: 'Reykjavík', country: 'IS', lat: 64.147, lon: -21.943, region: 'north', capital: true, emoji: '🌌' },
  { id: 'tallinn', ko: '탈린', en: 'Tallinn', country: 'EE', lat: 59.437, lon: 24.754, region: 'north', capital: true, emoji: '🏰' },
];

export const COUNTRIES = {
  DE: { ko: '독일', flag: '🇩🇪' }, FR: { ko: '프랑스', flag: '🇫🇷' }, NL: { ko: '네덜란드', flag: '🇳🇱' },
  BE: { ko: '벨기에', flag: '🇧🇪' }, LU: { ko: '룩셈부르크', flag: '🇱🇺' }, GB: { ko: '영국', flag: '🇬🇧' },
  IE: { ko: '아일랜드', flag: '🇮🇪' }, AT: { ko: '오스트리아', flag: '🇦🇹' }, CH: { ko: '스위스', flag: '🇨🇭' },
  CZ: { ko: '체코', flag: '🇨🇿' }, HU: { ko: '헝가리', flag: '🇭🇺' }, PL: { ko: '폴란드', flag: '🇵🇱' },
  SI: { ko: '슬로베니아', flag: '🇸🇮' }, IT: { ko: '이탈리아', flag: '🇮🇹' }, ES: { ko: '스페인', flag: '🇪🇸' },
  PT: { ko: '포르투갈', flag: '🇵🇹' }, GR: { ko: '그리스', flag: '🇬🇷' }, HR: { ko: '크로아티아', flag: '🇭🇷' },
  MT: { ko: '몰타', flag: '🇲🇹' }, DK: { ko: '덴마크', flag: '🇩🇰' }, SE: { ko: '스웨덴', flag: '🇸🇪' },
  NO: { ko: '노르웨이', flag: '🇳🇴' }, FI: { ko: '핀란드', flag: '🇫🇮' }, IS: { ko: '아이슬란드', flag: '🇮🇸' },
  EE: { ko: '에스토니아', flag: '🇪🇪' },
};

export const REGIONS = {
  central: '중부유럽', west: '서유럽', uk: '영국·아일랜드', south: '남유럽', east: '동유럽', north: '북유럽',
};

export const cityById = Object.fromEntries(CITIES.map(c => [c.id, c]));
