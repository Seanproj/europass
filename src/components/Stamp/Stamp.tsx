import { useId, useMemo, type CSSProperties } from 'react';
import type { City } from '../../data/types';
import { koreanDate } from '../../lib/date';
import { STAMP_C as C, type Outline } from './stampGeometry';
import { stampOrnament, stampParts, type StampOrnament, type StampPart } from './stampParts';
import { inkSeed, stampAngle, stampShape, type StampShape } from './stampMath';

interface Props {
  city: City;
  /** 없으면 아직 안 간 도시의 점선 고스트 도장 */
  visit?: { id: string; date: string } | null;
  /** 한 변 길이(px) */
  size?: number;
  /** 모양을 직접 정할 때 (테스트, 미리보기). 기본은 도시 id 해시 */
  shape?: StampShape;
  /** 테두리 장식을 직접 정할 때. 기본은 도시 id 해시 */
  ornament?: StampOrnament;
  /** 이 도시의 몇 번째 방문인지 (2 이상이면 로마 숫자 표식) */
  nth?: number;
  className?: string;
  style?: CSSProperties;
  /** 옆에 도시 이름이 같이 보이는 목록에서는 장식으로 (스크린리더가 두 번 읽지 않게) */
  decorative?: boolean;
}

/** 도장 v3: 이중선 테두리 + 장식 + JetBrains Mono 타이포 + 표식. 히든젬만 금색 */
export function Stamp({
  city,
  visit,
  size = 160,
  shape = stampShape(city.id),
  ornament,
  nth,
  className,
  style,
  decorative,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ghost = !visit;
  const color = ghost ? 'var(--text-2)' : city.gem ? 'var(--gold)' : 'var(--accent)';
  const angle = visit ? stampAngle(visit.id) : 0;
  const dash = ghost ? '4 3' : undefined;
  const date = visit?.date ?? null;
  const shownNth = visit ? nth : undefined;
  // 톱니·점 띠는 꼭짓점이 많아 다시 그릴 때마다 계산하지 않는다
  const parts = useMemo(
    () =>
      stampParts({ city, date, shape, ornament: ornament ?? stampOrnament(city.id, shape), nth: shownNth }),
    [city, date, shape, ornament, shownNth],
  );
  const outline = (o: Outline, sw: number, key: number) => {
    const line = {
      fill: 'none',
      stroke: color,
      strokeWidth: sw,
      strokeDasharray: dash,
      strokeLinejoin: 'round' as const,
    };
    if (o.kind === 'circle') return <circle key={key} cx={C} cy={C} r={o.r} {...line} />;
    if (o.kind === 'ellipse') return <ellipse key={key} cx={C} cy={C} rx={o.rx} ry={o.ry} {...line} />;
    if (o.kind === 'rect')
      return <rect key={key} x={o.x} y={o.y} width={o.w} height={o.h} rx={o.r} {...line} />;
    return <polygon key={key} points={o.points.map(([x, y]) => `${x},${y}`).join(' ')} {...line} />;
  };
  const part = (p: StampPart, i: number) => {
    switch (p.kind) {
      case 'outline':
        return outline(p.outline, p.width, i);
      case 'text':
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize={p.size}
            fontWeight={p.weight}
            letterSpacing={p.letterSpacing}
            textLength={p.fit}
            lengthAdjust={p.fit ? 'spacingAndGlyphs' : undefined}
            fill={color}
          >
            {p.text}
          </text>
        );
      case 'glyph':
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            transform={`rotate(${p.rot} ${p.x} ${p.y})`}
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize={p.size}
            fontWeight={p.weight}
            fill={color}
          >
            {p.ch}
          </text>
        );
      case 'line':
        return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={color} strokeWidth={p.width} />;
      case 'dot':
        return <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} />;
      case 'star':
        return <polygon key={i} points={p.points.map(([x, y]) => `${x},${y}`).join(' ')} fill={color} />;
    }
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
            : `${city.name.ko} 도장, ${koreanDate(visit.date)}${nth && nth >= 2 ? `, ${nth}번째 방문` : ''}`
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
        {parts.map(part)}
      </g>
    </svg>
  );
}
