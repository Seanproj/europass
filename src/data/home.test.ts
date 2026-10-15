import { describe, expect, it } from 'vitest';
import { HOME_KOREA, HOME_NONE, homeLabel, homePlace } from './home';

describe('출발지', () => {
  it('정하지 않음', () => {
    expect(homePlace(HOME_NONE)).toBeNull();
    expect(homePlace(undefined)).toBeNull();
    expect(homeLabel(HOME_NONE)).toBe('정하지 않음');
  });

  it('유럽 도시', () => {
    expect(homePlace('de-frankfurt')).toMatchObject({
      name: '프랑크푸르트',
      country: 'DE',
      city: { id: 'de-frankfurt' },
    });
    expect(homeLabel('de-frankfurt')).toBe('프랑크푸르트 · 독일');
  });

  it('한국은 나라 단위, 거리는 서울 기준', () => {
    const kr = homePlace(HOME_KOREA)!;
    expect(kr).toMatchObject({ name: '한국', country: 'KR' });
    expect(kr.city).toBeUndefined();
    expect(kr.lat).toBeCloseTo(37.57, 1);
    expect(homeLabel(HOME_KOREA)).toBe('한국');
  });

  it('모르는 값은 정하지 않음으로', () => {
    expect(homePlace('xx-nowhere')).toBeNull();
  });
});
