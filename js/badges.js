// 업적(배지) 정의 — stats는 app.js의 computeStats() 결과
import { CITIES } from './cities.js';

const DE_COUNT = CITIES.filter(c => c.country === 'DE').length;

export const BADGES = [
  { id: 'first', icon: '👣', name: '첫 발자국', desc: '첫 도시에 도장 찍기', goal: 1, value: s => s.cityCount },
  { id: 'five', icon: '🎒', name: '배낭 여행자', desc: '5개 도시 클리어', goal: 5, value: s => s.cityCount },
  { id: 'ten', icon: '🧭', name: '방랑자', desc: '10개 도시 클리어', goal: 10, value: s => s.cityCount },
  { id: 'twentyfive', icon: '🌍', name: '유럽 정복자', desc: '25개 도시 클리어', goal: 25, value: s => s.cityCount },
  { id: 'grand', icon: '👑', name: '그랜드 투어', desc: '모든 도시 클리어', goal: CITIES.length, value: s => s.cityCount },
  { id: 'border5', icon: '🛂', name: '국경 넘기', desc: '5개국 방문', goal: 5, value: s => s.countryCount },
  { id: 'border10', icon: '🗺️', name: '여권 수집가', desc: '10개국 방문', goal: 10, value: s => s.countryCount },
  { id: 'germany', icon: '🥨', name: '독일 마스터', desc: '독일 도시 모두 클리어', goal: DE_COUNT, value: s => s.byCountry.DE || 0 },
  { id: 'med', icon: '☀️', name: '지중해의 햇살', desc: '남유럽 4개 도시', goal: 4, value: s => s.byRegion.south || 0 },
  { id: 'nordic', icon: '❄️', name: '북유럽 감성', desc: '북유럽 3개 도시', goal: 3, value: s => s.byRegion.north || 0 },
  { id: 'east', icon: '🏰', name: '동유럽 낭만', desc: '동유럽 3개 도시', goal: 3, value: s => s.byRegion.east || 0 },
  { id: 'regions', icon: '🧳', name: '유럽 한 바퀴', desc: '6개 권역 모두 방문', goal: 6, value: s => Object.keys(s.byRegion).length },
  { id: 'capitals', icon: '🏛️', name: '수도 컬렉터', desc: '수도 10곳 방문', goal: 10, value: s => s.capitalCount },
  { id: 'seasons', icon: '🍂', name: '사계절 여행자', desc: '봄·여름·가을·겨울 모두 여행', goal: 4, value: s => s.seasons.size },
  { id: 'repeat', icon: '💞', name: '또 왔어요', desc: '같은 도시 재방문', goal: 2, value: s => s.maxVisitsPerCity },
  { id: 'writer', icon: '✍️', name: '여행 작가', desc: '100자 넘는 기록 5개', goal: 5, value: s => s.longNotes },
  { id: 'photo', icon: '📸', name: '포토그래퍼', desc: '사진 30장 남기기', goal: 30, value: s => s.photoCount },
  { id: 'far', icon: '✈️', name: '멀리 멀리', desc: '집에서 2,000km 넘는 도시', goal: 2000, value: s => Math.round(s.farthestKm), unit: 'km' },
];

export function evaluateBadges(stats) {
  return BADGES.map(b => {
    const v = b.value(stats);
    return { ...b, current: Math.min(v, b.goal), done: v >= b.goal };
  });
}
