import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stamp } from './Stamp';
import { STAMP_SHAPES, fitMono, hash32, stampAngle, stampShape } from './stampMath';
import { STAMP_ORNAMENTS, roman, stampOrnament, stampParts } from './stampParts';
import { CITIES, getCity } from '../../data/cities';

const prague = getCity('cz-prague')!;
const VISIT = { id: 'visit-1', date: '2026-10-13' };

describe('도장 v3', () => {
  it.each(STAMP_SHAPES.flatMap((s) => STAMP_ORNAMENTS.map((o) => [s, o] as const)))(
    '모양·장식 고정: %s · %s',
    (shape, ornament) => {
      const { container } = render(<Stamp city={prague} visit={VISIT} shape={shape} ornament={ornament} />);
      expect(container.innerHTML).toMatchSnapshot();
    },
  );

  it('미방문 고스트 도장 (점선, 날짜 없음)', () => {
    const { container } = render(<Stamp city={prague} shape="circle" ornament="plain" />);
    expect(container.innerHTML).toMatchSnapshot();
    expect(screen.getByRole('img', { name: '프라하 도장 (아직 없음)' })).toBeInTheDocument();
    expect(container.querySelector('[stroke-dasharray]')).not.toBeNull();
    expect(container.querySelector('filter')).toBeNull();
  });

  it('내부 글자: 나라 / 도시(현지 표기) / 날짜 / 위도 / 경도', () => {
    const { container } = render(<Stamp city={prague} visit={VISIT} ornament="plain" />);
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

  it('장식은 도시 id로 고정, 둘레 글자는 원에서만', () => {
    const all = new Set(CITIES.map((c) => stampOrnament(c.id, stampShape(c.id))));
    expect(all).toEqual(new Set(STAMP_ORNAMENTS));
    for (const c of CITIES)
      if (stampShape(c.id) !== 'circle') expect(stampOrnament(c.id, stampShape(c.id))).not.toBe('arc');
    // 원이 아닌 모양에 arc를 줘도 평범한 테두리로
    const parts = stampParts({ city: prague, date: VISIT.date, shape: 'hex', ornament: 'arc' });
    expect(parts.some((p) => p.kind === 'glyph')).toBe(false);
  });

  it('둘레 글자: 위는 나라, 아래는 좌표, 가운데는 도시와 날짜', () => {
    const parts = stampParts({ city: prague, date: VISIT.date, shape: 'circle', ornament: 'arc' });
    const glyphs = parts.flatMap((p) => (p.kind === 'glyph' ? [p] : []));
    expect(
      glyphs
        .filter((g) => g.y < 80)
        .map((g) => g.ch)
        .join(''),
    ).toBe('CZECHIA');
    expect(
      glyphs
        .filter((g) => g.y > 80)
        .map((g) => g.ch)
        .join(''),
    ).toBe('50.0880° N · 14.4208° E');
    const texts = parts.flatMap((p) => (p.kind === 'text' ? [p.text] : []));
    expect(texts).toEqual(['PRAHA', '13 OCT 2026']);
  });

  it('수도는 별 2개, 아닌 도시는 없음', () => {
    const stars = (city: typeof prague) =>
      stampParts({ city, date: VISIT.date, shape: 'rect', ornament: 'plain' }).filter(
        (p) => p.kind === 'star',
      );
    expect(stars(prague)).toHaveLength(2);
    expect(stars(getCity('de-heidelberg')!)).toHaveLength(0);
  });

  it('재방문은 구분선 가운데 로마 숫자, 첫 방문과 고스트는 없음', () => {
    const { container } = render(<Stamp city={prague} visit={VISIT} nth={3} ornament="plain" />);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toContain('III');
    expect(container.querySelectorAll('line')).toHaveLength(2);
    expect(
      screen.getByRole('img', { name: '프라하 도장, 2026년 10월 13일, 3번째 방문' }),
    ).toBeInTheDocument();
    const { container: first } = render(<Stamp city={prague} visit={VISIT} nth={1} ornament="plain" />);
    expect(first.querySelectorAll('line')).toHaveLength(1);
    const { container: ghost } = render(<Stamp city={prague} nth={3} ornament="plain" />);
    expect([...ghost.querySelectorAll('text')].map((t) => t.textContent)).not.toContain('III');
    expect([1, 2, 4, 9, 14, 39, 40].map(roman)).toEqual(['I', 'II', 'IV', 'IX', 'XIV', 'XXXIX', '40']);
  });

  it('고스트 도장의 톱니는 평범한 테두리로', () => {
    const parts = stampParts({ city: prague, date: null, shape: 'circle', ornament: 'teeth' });
    expect(parts[0]).toMatchObject({ kind: 'outline', outline: { kind: 'circle' } });
  });
});
