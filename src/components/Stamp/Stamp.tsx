import { useId, type CSSProperties } from 'react';
import type { City } from '../../data/types';
import { koreanDate } from '../../lib/date';
import {
  FRAMES,
  INNER_WIDTH,
  OUTER_WIDTH,
  STAMP_C as C,
  stampLayout,
  type Outline,
  type StampLine,
} from './stampGeometry';
import { inkSeed, stampAngle, stampShape, type StampShape } from './stampMath';

interface Props {
  city: City;
  /** 없으면 아직 안 간 도시의 점선 고스트 도장 */
  visit?: { id: string; date: string } | null;
  /** 한 변 길이(px) */
  size?: number;
  /** 모양을 직접 정할 때 (테스트, 미리보기). 기본은 도시 id 해시 */
  shape?: StampShape;
  className?: string;
  style?: CSSProperties;
  /** 옆에 도시 이름이 같이 보이는 목록에서는 장식으로 (스크린리더가 두 번 읽지 않게) */
  decorative?: boolean;
}

/** 도장 v2: 이중선 테두리 + JetBrains Mono 타이포. 히든젬만 금색 */
export function Stamp({
  city,
  visit,
  size = 160,
  shape = stampShape(city.id),
  className,
  style,
  decorative,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ghost = !visit;
  const color = ghost ? 'var(--text-2)' : city.gem ? 'var(--gold)' : 'var(--accent)';
  const angle = visit ? stampAngle(visit.id) : 0;
  const dash = ghost ? '4 3' : undefined;
  const { lines, rule } = stampLayout(city, visit?.date ?? null, shape);
  const { outer, inner } = FRAMES[shape];
  const text = (l: StampLine) => (
    <text
      key={l.y}
      x={C}
      y={l.y}
      textAnchor="middle"
      fontFamily="var(--mono)"
      fontSize={l.size}
      fontWeight={l.weight}
      letterSpacing={l.letterSpacing}
      textLength={l.fit}
      lengthAdjust={l.fit ? 'spacingAndGlyphs' : undefined}
      fill={color}
    >
      {l.text}
    </text>
  );
  const outline = (o: Outline, sw: number) => {
    const line = {
      fill: 'none',
      stroke: color,
      strokeWidth: sw,
      strokeDasharray: dash,
      strokeLinejoin: 'round' as const,
    };
    if (o.kind === 'circle') return <circle cx={C} cy={C} r={o.r} {...line} />;
    if (o.kind === 'ellipse') return <ellipse cx={C} cy={C} rx={o.rx} ry={o.ry} {...line} />;
    if (o.kind === 'rect') return <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={o.r} {...line} />;
    return <polygon points={o.points.map(([x, y]) => `${x},${y}`).join(' ')} {...line} />;
  };

  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={
        decorative
          ? undefined
          : ghost
            ? `${city.name.ko} 도장 (아직 없음)`
            : `${city.name.ko} 도장, ${koreanDate(visit.date)}`
      }
    >
      {!ghost && (
        <defs>
          {/* 잉크 결: 아주 미세한 점 빠짐만. 번짐·왜곡 없음 */}
          <filter id={`ink-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".85"
              numOctaves={2}
              seed={inkSeed(city.id)}
              result="n"
            />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -9 0 0 0 7.1"
              result="holes"
            />
            <feComposite in="SourceGraphic" in2="holes" operator="in" />
          </filter>
        </defs>
      )}
      <g
        transform={angle ? `rotate(${angle} ${C} ${C})` : undefined}
        filter={ghost ? undefined : `url(#ink-${uid})`}
        opacity={ghost ? 0.55 : 0.94}
      >
        {outline(outer, OUTER_WIDTH)}
        {outline(inner, INNER_WIDTH)}
        {lines.slice(0, 3).map(text)}
        <line
          x1={C - rule.half}
          y1={rule.y}
          x2={C + rule.half}
          y2={rule.y}
          stroke={color}
          strokeWidth={0.8}
        />
        {lines.slice(3).map(text)}
      </g>
    </svg>
  );
}
