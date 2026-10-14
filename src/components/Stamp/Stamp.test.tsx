import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stamp } from './Stamp';
import { STAMP_SHAPES, fitMono, hash32, stampAngle, stampShape } from './stampMath';
import { CITIES, getCity } from '../../data/cities';

const prague = getCity('cz-prague')!;
const VISIT = { id: 'visit-1', date: '2026-10-13' };

describe('도장 v2', () => {
  it.each(STAMP_SHAPES)('모양 고정: %s', (shape) => {
    const { container } = render(<Stamp city={prague} visit={VISIT} shape={shape} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('미방문 고스트 도장 (점선, 날짜 없음)', () => {
    const { container } = render(<Stamp city={prague} shape="circle" />);
    expect(container.innerHTML).toMatchSnapshot();
    expect(screen.getByRole('img', { name: '프라하 도장 (아직 없음)' })).toBeInTheDocument();
    expect(container.querySelector('[stroke-dasharray]')).not.toBeNull();
    expect(container.querySelector('filter')).toBeNull();
  });

  it('내부 글자: 나라 / 도시(현지 표기) / 날짜 / 위도 / 경도', () => {
    const { container } = render(<Stamp city={prague} visit={VISIT} />);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toEqual(['CZECHIA', 'PRAHA', '13 OCT 2026', '50.0880° N', '14.4208° E']);
    expect(screen.getByRole('img', { name: '프라하 도장, 2026년 10월 13일' })).toBeInTheDocument();
  });

  it('색: 기본 --accent, 히든젬만 --gold', () => {
    const gem = CITIES.find((c) => c.gem)!;
    const { container: a } = render(<Stamp city={prague} visit={VISIT} />);
    const { container: b } = render(<Stamp city={gem} visit={VISIT} />);
    expect(a.querySelector('text')!.getAttribute('fill')).toBe('var(--accent)');
    expect(b.querySelector('text')!.getAttribute('fill')).toBe('var(--gold)');
  });

  it('모양은 도시 id, 각도는 방문 id로 고정 (±9°)', () => {
    expect(stampShape('cz-prague')).toBe(stampShape('cz-prague'));
    const shapes = new Set(CITIES.map((c) => stampShape(c.id)));
    expect(shapes.size).toBe(5);
    for (let i = 0; i < 200; i++) {
      const a = stampAngle(`v${i}`);
      expect(a).toBeGreaterThanOrEqual(-9);
      expect(a).toBeLessThanOrEqual(9);
    }
    expect(hash32('abc')).toBe(hash32('abc'));
  });

  it('긴 이름은 글자를 줄이고, 그래도 넘치면 폭에 맞춘다', () => {
    expect(fitMono('PRAHA', [16, 13], 0.18, 108)).toMatchObject({ size: 16, fit: undefined });
    const long = fitMono('ROTHENBURG OB DER TAUBER', [16, 13, 11, 9], 0.18, 108);
    expect(long.size).toBe(9);
    expect(long.fit).toBe(108);
  });
});
