/** 여권 발급 오프닝을 이 기기에서 봤는지 (기기마다 한 번이면 되므로 localStorage) */
const KEY = 'euro-passport:intro-seen';

export function introSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // 저장소를 못 쓰면 매번 보이지 않게 본 것으로 친다
    return true;
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // 막혀 있으면 무시
  }
}
